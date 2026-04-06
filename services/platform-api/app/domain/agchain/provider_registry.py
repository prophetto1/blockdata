from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.infra.supabase_client import get_supabase_admin


PROVIDER_CATEGORIES = {"model_provider", "cloud_provider"}
CREDENTIAL_FORM_KINDS = {"basic_api_key", "vertex_ai"}
PROBE_STRATEGIES = {
    "provider_default",
    "http_openai_models",
    "http_anthropic_models",
    "http_google_models",
    "custom_http",
    "none",
}


def _trim_to_none(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    return trimmed or None


def _normalize_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    normalized: list[str] = []
    for item in value:
        if not isinstance(item, str):
            continue
        trimmed = item.strip()
        if trimmed and trimmed not in normalized:
            normalized.append(trimmed)
    return normalized


def _normalize_provider_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "provider_slug": row["provider_slug"],
        "display_name": row["display_name"],
        "provider_category": row["provider_category"],
        "credential_form_kind": row["credential_form_kind"],
        "env_var_name": row.get("env_var_name"),
        "docs_url": row.get("docs_url"),
        "supported_auth_kinds": _normalize_string_list(row.get("supported_auth_kinds_jsonb")),
        "default_probe_strategy": row.get("default_probe_strategy") or "provider_default",
        "default_capabilities": row.get("default_capabilities_jsonb") or {},
        "supports_custom_base_url": bool(row.get("supports_custom_base_url")),
        "supports_model_args": bool(row.get("supports_model_args", True)),
        "enabled": bool(row.get("enabled", True)),
        "sort_order": int(row.get("sort_order") or 0),
        "notes": row.get("notes"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def _validate_provider_payload(payload: dict[str, Any], *, provider_slug: str | None = None) -> dict[str, Any]:
    resolved_provider_slug = provider_slug or _trim_to_none(payload.get("provider_slug"))
    if not resolved_provider_slug:
        raise HTTPException(status_code=422, detail="provider_slug is required")

    display_name = _trim_to_none(payload.get("display_name"))
    if not display_name:
        raise HTTPException(status_code=422, detail="display_name is required")

    provider_category = _trim_to_none(payload.get("provider_category"))
    if provider_category not in PROVIDER_CATEGORIES:
        raise HTTPException(status_code=422, detail="provider_category is invalid")

    credential_form_kind = _trim_to_none(payload.get("credential_form_kind"))
    if credential_form_kind not in CREDENTIAL_FORM_KINDS:
        raise HTTPException(status_code=422, detail="credential_form_kind is invalid")

    supported_auth_kinds = _normalize_string_list(payload.get("supported_auth_kinds"))
    if not supported_auth_kinds:
        raise HTTPException(status_code=422, detail="supported_auth_kinds is required")

    default_probe_strategy = _trim_to_none(payload.get("default_probe_strategy")) or "provider_default"
    if default_probe_strategy not in PROBE_STRATEGIES:
        raise HTTPException(status_code=422, detail="default_probe_strategy is invalid")

    default_capabilities = payload.get("default_capabilities")
    if default_capabilities is None:
        default_capabilities = {}
    if not isinstance(default_capabilities, dict):
        raise HTTPException(status_code=422, detail="default_capabilities must be an object")

    sort_order_raw = payload.get("sort_order", 100)
    try:
        sort_order = int(sort_order_raw)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="sort_order must be an integer") from exc

    return {
        "provider_slug": resolved_provider_slug,
        "display_name": display_name,
        "provider_category": provider_category,
        "credential_form_kind": credential_form_kind,
        "env_var_name": _trim_to_none(payload.get("env_var_name")),
        "docs_url": _trim_to_none(payload.get("docs_url")),
        "supported_auth_kinds_jsonb": supported_auth_kinds,
        "default_probe_strategy": default_probe_strategy,
        "default_capabilities_jsonb": default_capabilities,
        "supports_custom_base_url": bool(payload.get("supports_custom_base_url", False)),
        "supports_model_args": bool(payload.get("supports_model_args", True)),
        "enabled": bool(payload.get("enabled", True)),
        "sort_order": sort_order,
        "notes": _trim_to_none(payload.get("notes")),
    }


def list_supported_providers(*, include_disabled: bool = True) -> list[dict[str, Any]]:
    sb = get_supabase_admin()
    rows = sb.table("agchain_provider_registry").select("*").execute().data or []
    normalized = [_normalize_provider_row(row) for row in rows]
    if not include_disabled:
        normalized = [row for row in normalized if row["enabled"]]
    return sorted(
        normalized,
        key=lambda row: (
            row["provider_category"] != "model_provider",
            row["sort_order"],
            row["display_name"].lower(),
        ),
    )


def resolve_provider_definition(provider_slug: str) -> dict[str, Any] | None:
    sb = get_supabase_admin()
    row = (
        sb.table("agchain_provider_registry")
        .select("*")
        .eq("provider_slug", provider_slug)
        .maybe_single()
        .execute()
        .data
    )
    if row is None:
        return None
    return _normalize_provider_row(row)


def create_provider_definition(*, user_id: str, payload: dict[str, Any]) -> str:
    sb = get_supabase_admin()
    insert_payload = _validate_provider_payload(payload)
    result = sb.table("agchain_provider_registry").insert(insert_payload).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to create provider definition")
    return str(rows[0]["provider_slug"])


def update_provider_definition(*, user_id: str, provider_slug: str, payload: dict[str, Any]) -> str:
    sb = get_supabase_admin()
    current = (
        sb.table("agchain_provider_registry")
        .select("*")
        .eq("provider_slug", provider_slug)
        .maybe_single()
        .execute()
        .data
    )
    if current is None:
        raise HTTPException(status_code=404, detail="Provider definition not found")

    merged = {
        "provider_slug": provider_slug,
        "display_name": payload.get("display_name", current.get("display_name")),
        "provider_category": payload.get("provider_category", current.get("provider_category")),
        "credential_form_kind": payload.get("credential_form_kind", current.get("credential_form_kind")),
        "env_var_name": payload.get("env_var_name", current.get("env_var_name")),
        "docs_url": payload.get("docs_url", current.get("docs_url")),
        "supported_auth_kinds": payload.get(
            "supported_auth_kinds",
            current.get("supported_auth_kinds_jsonb") or [],
        ),
        "default_probe_strategy": payload.get(
            "default_probe_strategy",
            current.get("default_probe_strategy"),
        ),
        "default_capabilities": payload.get(
            "default_capabilities",
            current.get("default_capabilities_jsonb") or {},
        ),
        "supports_custom_base_url": payload.get(
            "supports_custom_base_url",
            current.get("supports_custom_base_url", False),
        ),
        "supports_model_args": payload.get(
            "supports_model_args",
            current.get("supports_model_args", True),
        ),
        "enabled": payload.get("enabled", current.get("enabled", True)),
        "sort_order": payload.get("sort_order", current.get("sort_order", 100)),
        "notes": payload.get("notes", current.get("notes")),
    }
    update_payload = _validate_provider_payload(merged, provider_slug=provider_slug)
    result = (
        sb.table("agchain_provider_registry")
        .update(update_payload)
        .eq("provider_slug", provider_slug)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Provider definition not found")
    return str(rows[0]["provider_slug"])
