from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

from app.infra.supabase_client import get_supabase_admin

from .provider_registry import resolve_provider_definition


PROBE_STRATEGIES = {
    "provider_default",
    "http_openai_models",
    "http_anthropic_models",
    "http_google_models",
    "custom_http",
    "none",
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _display_api_base(api_base: str | None) -> str | None:
    if not isinstance(api_base, str):
        return None
    trimmed = api_base.strip()
    return trimmed.rstrip("/") if trimmed else None


def _row_query(sb):
    return sb.table("agchain_model_targets").select("*")


def _health_query(sb):
    return sb.table("agchain_model_health_checks").select("*")


def _normalize_row(row: dict[str, Any], provider_definition: dict[str, Any] | None) -> dict[str, Any]:
    display_name = (
        provider_definition["display_name"]
        if provider_definition is not None
        else row.get("provider_slug")
    )
    return {
        "model_target_id": row["model_target_id"],
        "label": row["label"],
        "provider_slug": row["provider_slug"],
        "provider_display_name": display_name,
        "provider_qualifier": row.get("provider_qualifier"),
        "model_name": row["model_name"],
        "qualified_model": row["qualified_model"],
        "api_base_display": _display_api_base(row.get("api_base")),
        "auth_kind": row["auth_kind"],
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
    probe_strategy = payload.get("probe_strategy") or "provider_default"
    if probe_strategy not in PROBE_STRATEGIES:
        raise HTTPException(status_code=422, detail="probe_strategy is invalid")
    return definition


def list_model_targets(
    *,
    provider_slug: str | None = None,
    compatibility: str | None = None,
    health_status: str | None = None,
    enabled: bool | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    rows = _row_query(sb).order("updated_at", desc=True).execute().data or []
    normalized = [
        _normalize_row(row, resolve_provider_definition(row["provider_slug"]))
        for row in rows
    ]
    filtered = _apply_filters(
        normalized,
        provider_slug=provider_slug,
        compatibility=compatibility,
        health_status=health_status,
        enabled=enabled,
        search=search,
    )
    return {
        "items": filtered[offset : offset + limit],
        "total": len(filtered),
        "limit": limit,
        "offset": offset,
    }


def load_model_detail(*, model_target_id: str) -> tuple[dict[str, Any] | None, list[dict[str, Any]], dict[str, Any] | None]:
    sb = get_supabase_admin()
    row = _row_query(sb).eq("model_target_id", model_target_id).maybe_single().execute().data
    if not row:
        return None, [], None
    provider_definition = resolve_provider_definition(row["provider_slug"])
    checks = (
        _health_query(sb)
        .eq("model_target_id", model_target_id)
        .order("checked_at", desc=True)
        .limit(10)
        .execute()
        .data
        or []
    )
    return _normalize_row(row, provider_definition), checks, provider_definition


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
        raise HTTPException(status_code=500, detail="Failed to create AGChain model target")
    return str(rows[0]["model_target_id"])


def update_model_target(*, user_id: str, model_target_id: str, payload: dict[str, Any]) -> str:
    sb = get_supabase_admin()
    current = _row_query(sb).eq("model_target_id", model_target_id).maybe_single().execute().data
    if current is None:
        raise HTTPException(status_code=404, detail="AGChain model target not found")

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
        raise HTTPException(status_code=404, detail="AGChain model target not found")
    return str(rows[0]["model_target_id"])
