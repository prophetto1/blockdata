from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException
from opentelemetry import trace

from app.infra.crypto import decrypt_with_context
from app.infra.supabase_client import get_supabase_admin
from app.observability.otel import safe_attributes

from .model_provider_catalog import resolve_provider_definition

logger = logging.getLogger("agchain-model-registry")
tracer = trace.get_tracer(__name__)
USER_API_KEYS_CONTEXT = "user-api-keys-v1"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _display_api_base(api_base: str | None) -> str | None:
    return api_base.rstrip("/") if isinstance(api_base, str) and api_base.strip() else None


def _row_query(sb):
    return sb.table("agchain_model_targets").select("*")


def _health_query(sb):
    return sb.table("agchain_model_health_checks").select("*")


def _resolve_credential_status(sb, user_id: str, row: dict[str, Any]) -> str:
    auth_kind = row.get("auth_kind")
    provider_slug = row.get("provider_slug")
    if auth_kind == "none":
        return "not_required"

    credential_source = row.get("credential_source_jsonb") or {}
    source_kind = credential_source.get("source")

    if auth_kind == "api_key":
        result = (
            sb.table("user_api_keys")
            .select("id, provider, is_valid, base_url")
            .eq("user_id", user_id)
            .eq("provider", provider_slug)
            .limit(1)
            .execute()
        )
        match = (result.data or [None])[0]
        if not match:
            return "missing"
        if match.get("is_valid") is False:
            return "invalid"
        return "ready"

    query = (
        sb.table("user_provider_connections")
        .select("id, status, connection_type")
        .eq("user_id", user_id)
        .eq("provider", provider_slug)
    )
    if source_kind == "user_provider_connections" and credential_source.get("connection_type"):
        query = query.eq("connection_type", credential_source["connection_type"])
    result = query.limit(1).execute()
    match = (result.data or [None])[0]
    if not match:
        return "missing"
    if match.get("status") != "connected":
        return "disconnected"
    return "ready"


def _normalize_row(sb, user_id: str, row: dict[str, Any]) -> dict[str, Any]:
    provider = resolve_provider_definition(row["provider_slug"]) or {
        "display_name": row["provider_slug"],
        "default_probe_strategy": row.get("probe_strategy") or "provider_default",
    }
    credential_status = _resolve_credential_status(sb, user_id, row)
    return {
        "model_target_id": row["model_target_id"],
        "label": row["label"],
        "provider_slug": row["provider_slug"],
        "provider_display_name": provider["display_name"],
        "provider_qualifier": row.get("provider_qualifier"),
        "model_name": row["model_name"],
        "qualified_model": row["qualified_model"],
        "api_base_display": _display_api_base(row.get("api_base")),
        "auth_kind": row["auth_kind"],
        "credential_status": credential_status,
        "enabled": row["enabled"],
        "supports_evaluated": row["supports_evaluated"],
        "supports_judge": row["supports_judge"],
        "capabilities": row.get("capabilities_jsonb") or {},
        "health_status": row["health_status"],
        "health_checked_at": row.get("health_checked_at"),
        "last_latency_ms": row.get("last_latency_ms"),
        "probe_strategy": row.get("probe_strategy"),
        "notes": row.get("notes"),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _apply_filters(
    rows: list[dict[str, Any]],
    *,
    provider_slug: str | None,
    compatibility: str | None,
    health_status: str | None,
    enabled: bool | None,
    search: str | None,
) -> list[dict[str, Any]]:
    items = rows
    if provider_slug:
        items = [row for row in items if row["provider_slug"] == provider_slug]
    if compatibility == "evaluated":
        items = [row for row in items if row["supports_evaluated"]]
    elif compatibility == "judge":
        items = [row for row in items if row["supports_judge"]]
    if health_status:
        items = [row for row in items if row["health_status"] == health_status]
    if enabled is not None:
        items = [row for row in items if row["enabled"] is enabled]
    if search:
        needle = search.lower()
        items = [
            row
            for row in items
            if needle in row["label"].lower()
            or needle in row["provider_display_name"].lower()
            or needle in row["qualified_model"].lower()
            or needle in row["model_name"].lower()
        ]
    return items


def list_model_targets(
    *,
    user_id: str,
    provider_slug: str | None = None,
    compatibility: str | None = None,
    health_status: str | None = None,
    enabled: bool | None = None,
    search: str | None = None,
) -> list[dict[str, Any]]:
    sb = get_supabase_admin()
    result = _row_query(sb).order("updated_at", desc=True).execute()
    rows = result.data or []
    normalized = [_normalize_row(sb, user_id, row) for row in rows]
    return _apply_filters(
        normalized,
        provider_slug=provider_slug,
        compatibility=compatibility,
        health_status=health_status,
        enabled=enabled,
        search=search,
    )


def load_model_detail(*, user_id: str, model_target_id: str) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    sb = get_supabase_admin()
    result = _row_query(sb).eq("model_target_id", model_target_id).maybe_single().execute()
    row = result.data
    if not row:
        return None, []
    checks = (
        _health_query(sb)
        .eq("model_target_id", model_target_id)
        .order("checked_at", desc=True)
        .limit(10)
        .execute()
    )
    return _normalize_row(sb, user_id, row), (checks.data or [])


def _validate_provider_payload(payload: dict[str, Any]) -> dict[str, Any]:
    provider_slug = payload.get("provider_slug")
    if not provider_slug:
        raise HTTPException(status_code=422, detail="provider_slug is required")
    definition = resolve_provider_definition(provider_slug)
    if definition is None:
        raise HTTPException(status_code=422, detail=f"Unsupported provider_slug: {provider_slug}")
    auth_kind = payload.get("auth_kind")
    if auth_kind not in definition["supported_auth_kinds"]:
        raise HTTPException(
            status_code=422,
            detail=f"auth_kind '{auth_kind}' is not supported for provider '{provider_slug}'",
        )
    payload["probe_strategy"] = payload.get("probe_strategy") or "provider_default"
    return definition


def create_model_target(*, user_id: str, payload: dict[str, Any]) -> str:
    _validate_provider_payload(payload)
    sb = get_supabase_admin()
    insert_payload = {
        "label": payload["label"],
        "provider_slug": payload["provider_slug"],
        "provider_qualifier": payload.get("provider_qualifier"),
        "model_name": payload["model_name"],
        "qualified_model": payload["qualified_model"],
        "api_base": payload.get("api_base"),
        "auth_kind": payload["auth_kind"],
        "credential_source_jsonb": payload.get("credential_source_jsonb") or {},
        "model_args_jsonb": payload.get("model_args_jsonb") or {},
        "supports_evaluated": payload.get("supports_evaluated", True),
        "supports_judge": payload.get("supports_judge", False),
        "capabilities_jsonb": payload.get("capabilities_jsonb") or {},
        "enabled": payload.get("enabled", True),
        "probe_strategy": payload.get("probe_strategy", "provider_default"),
        "notes": payload.get("notes"),
        "updated_at": _utc_now_iso(),
    }
    result = sb.table("agchain_model_targets").insert(insert_payload).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to create AG chain model target")
    return rows[0]["model_target_id"]


def update_model_target(*, user_id: str, model_target_id: str, payload: dict[str, Any]) -> str:
    sb = get_supabase_admin()
    current_result = _row_query(sb).eq("model_target_id", model_target_id).maybe_single().execute()
    current = current_result.data
    if not current:
        raise HTTPException(status_code=404, detail="AG chain model target not found")

    if "auth_kind" in payload:
        merged = {
            "provider_slug": current["provider_slug"],
            "auth_kind": payload["auth_kind"],
            "probe_strategy": payload.get("probe_strategy", current.get("probe_strategy")),
        }
        _validate_provider_payload(merged)

    update_payload = {
        key: value
        for key, value in payload.items()
        if key
        in {
            "label",
            "api_base",
            "auth_kind",
            "credential_source_jsonb",
            "model_args_jsonb",
            "supports_evaluated",
            "supports_judge",
            "capabilities_jsonb",
            "enabled",
            "probe_strategy",
            "notes",
        }
    }
    update_payload["updated_at"] = _utc_now_iso()
    result = (
        sb.table("agchain_model_targets")
        .update(update_payload)
        .eq("model_target_id", model_target_id)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="AG chain model target not found")
    return rows[0]["model_target_id"]


def _load_api_key(sb, user_id: str, provider_slug: str) -> str | None:
    result = (
        sb.table("user_api_keys")
        .select("api_key_encrypted")
        .eq("user_id", user_id)
        .eq("provider", provider_slug)
        .limit(1)
        .execute()
    )
    row = (result.data or [None])[0]
    if not row or not row.get("api_key_encrypted"):
        return None
    secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    return decrypt_with_context(row["api_key_encrypted"], secret, USER_API_KEYS_CONTEXT)


async def _run_provider_probe(
    *,
    sb,
    row: dict[str, Any],
    provider_definition: dict[str, Any],
    user_id: str,
    credential_status: str,
) -> dict[str, Any]:
    effective_strategy = row.get("probe_strategy") or "provider_default"
    if effective_strategy == "provider_default":
        effective_strategy = provider_definition["default_probe_strategy"]

    if row["auth_kind"] != "none" and credential_status != "ready":
        return {
            "health_status": "degraded",
            "latency_ms": None,
            "message": f"credential status is {credential_status}",
            "probe_strategy": effective_strategy,
            "error_code": "credential_not_ready",
        }

    if effective_strategy == "none":
        return {
            "health_status": "healthy",
            "latency_ms": 0,
            "message": "probe skipped by provider strategy",
            "probe_strategy": effective_strategy,
            "error_code": None,
        }

    api_base = _display_api_base(row.get("api_base"))
    if not api_base:
        return {
            "health_status": "degraded",
            "latency_ms": None,
            "message": "missing api_base for probeable target",
            "probe_strategy": effective_strategy,
            "error_code": "missing_api_base",
        }

    url = f"{api_base}/models"
    headers: dict[str, str] = {}
    if row["auth_kind"] == "api_key":
        api_key = _load_api_key(sb, user_id, row["provider_slug"])
        if not api_key:
            return {
                "health_status": "degraded",
                "latency_ms": None,
                "message": "api key not available",
                "probe_strategy": effective_strategy,
                "error_code": "missing_api_key",
            }
        if row["provider_slug"] == "anthropic":
            headers["x-api-key"] = api_key
            headers["anthropic-version"] = "2023-06-01"
        elif row["provider_slug"] == "google":
            headers["x-goog-api-key"] = api_key
        else:
            headers["Authorization"] = f"Bearer {api_key}"

    probe_attrs = safe_attributes(
        {
            "provider_slug": row["provider_slug"],
            "probe_strategy": effective_strategy,
            "auth_kind": row["auth_kind"],
        }
    )
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.models.provider_probe") as span:
        for key, value in probe_attrs.items():
            span.set_attribute(key, value)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=headers)
            latency_ms = max(0, int((time.perf_counter() - start) * 1000))
            span.set_attribute("http.status_code", response.status_code)
            span.set_attribute("latency_ms", latency_ms)
            if response.status_code < 400:
                return {
                    "health_status": "healthy",
                    "latency_ms": latency_ms,
                    "message": "probe ok",
                    "probe_strategy": effective_strategy,
                    "error_code": None,
                }
            return {
                "health_status": "error",
                "latency_ms": latency_ms,
                "message": f"probe returned {response.status_code}",
                "probe_strategy": effective_strategy,
                "error_code": f"http_{response.status_code}",
            }
        except Exception as exc:
            span.record_exception(exc)
            span.set_attribute("error.type", type(exc).__name__)
            logger.warning(
                "agchain.models.provider_probe_failed",
                extra={
                    "provider_slug": row["provider_slug"],
                    "probe_strategy": effective_strategy,
                    "error_type": type(exc).__name__,
                },
            )
            return {
                "health_status": "error",
                "latency_ms": None,
                "message": str(exc),
                "probe_strategy": effective_strategy,
                "error_code": type(exc).__name__,
            }


async def refresh_model_target_health(*, user_id: str, model_target_id: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    result = _row_query(sb).eq("model_target_id", model_target_id).maybe_single().execute()
    row = result.data
    if not row:
        raise HTTPException(status_code=404, detail="AG chain model target not found")

    provider_definition = resolve_provider_definition(row["provider_slug"])
    if provider_definition is None:
        raise HTTPException(status_code=422, detail=f"Unsupported provider_slug: {row['provider_slug']}")

    credential_status = _resolve_credential_status(sb, user_id, row)
    outcome = await _run_provider_probe(
        sb=sb,
        row=row,
        provider_definition=provider_definition,
        user_id=user_id,
        credential_status=credential_status,
    )
    checked_at = _utc_now_iso()
    sb.table("agchain_model_health_checks").insert(
        {
            "model_target_id": model_target_id,
            "provider_slug": row["provider_slug"],
            "probe_strategy": outcome["probe_strategy"],
            "status": outcome["health_status"],
            "latency_ms": outcome["latency_ms"],
            "error_code": outcome["error_code"],
            "error_message": outcome["message"],
            "checked_at": checked_at,
            "checked_by": user_id,
            "metadata_jsonb": {"credential_status": credential_status},
        }
    ).execute()
    sb.table("agchain_model_targets").update(
        {
            "health_status": outcome["health_status"],
            "health_checked_at": checked_at,
            "last_latency_ms": outcome["latency_ms"],
            "last_error_code": outcome["error_code"],
            "last_error_message": outcome["message"],
            "updated_at": checked_at,
        }
    ).eq("model_target_id", model_target_id).execute()
    return {
        "health_status": outcome["health_status"],
        "latency_ms": outcome["latency_ms"],
        "checked_at": checked_at,
        "message": outcome["message"],
        "probe_strategy": outcome["probe_strategy"],
    }
