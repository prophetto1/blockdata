from __future__ import annotations

from datetime import datetime, timezone
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


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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


def _display_api_base(api_base: str | None) -> str | None:
    trimmed = _trim_to_none(api_base)
    if trimmed is None:
        return None
    return trimmed.rstrip("/")


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


def _normalize_provider_model_row(
    row: dict[str, Any],
    provider_definition: dict[str, Any] | None,
) -> dict[str, Any]:
    provider_display_name = (
        provider_definition["display_name"]
        if provider_definition is not None
        else row.get("provider_slug")
    )
    return {
        "provider_model_id": row["provider_model_id"],
        "label": row["label"],
        "provider_slug": row["provider_slug"],
        "provider_display_name": provider_display_name,
        "model_id": row["model_id"],
        "qualified_model": row["qualified_model"],
        "api_base_display": _display_api_base(row.get("api_base")),
        "auth_kind": row["auth_kind"],
        "config_jsonb": row.get("config_jsonb") or {},
        "capabilities_jsonb": row.get("capabilities_jsonb") or {},
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


def _validate_provider_model_payload(
    payload: dict[str, Any],
    *,
    provider_model_id: str | None = None,
    current_provider_slug: str | None = None,
) -> dict[str, Any]:
    provider_slug = _trim_to_none(payload.get("provider_slug")) or current_provider_slug
    if not provider_slug:
        raise HTTPException(status_code=422, detail="provider_slug is required")

    provider_definition = resolve_provider_definition(provider_slug)
    if provider_definition is None:
        raise HTTPException(status_code=422, detail=f"Unsupported provider_slug: {provider_slug}")

    label = _trim_to_none(payload.get("label"))
    if not label:
        raise HTTPException(status_code=422, detail="label is required")

    model_id = _trim_to_none(payload.get("model_id"))
    if not model_id:
        raise HTTPException(status_code=422, detail="model_id is required")

    qualified_model = _trim_to_none(payload.get("qualified_model"))
    if not qualified_model:
        raise HTTPException(status_code=422, detail="qualified_model is required")

    auth_kind = _trim_to_none(payload.get("auth_kind"))
    if not auth_kind:
        raise HTTPException(status_code=422, detail="auth_kind is required")
    if auth_kind not in provider_definition["supported_auth_kinds"]:
        raise HTTPException(
            status_code=422,
            detail=f"auth_kind '{auth_kind}' is not supported for provider '{provider_slug}'",
        )

    config_jsonb = payload.get("config_jsonb")
    if config_jsonb is None:
        config_jsonb = {}
    if not isinstance(config_jsonb, dict):
        raise HTTPException(status_code=422, detail="config_jsonb must be an object")

    capabilities_jsonb = payload.get("capabilities_jsonb")
    if capabilities_jsonb is None:
        capabilities_jsonb = {}
    if not isinstance(capabilities_jsonb, dict):
        raise HTTPException(status_code=422, detail="capabilities_jsonb must be an object")

    sort_order_raw = payload.get("sort_order", 100)
    try:
        sort_order = int(sort_order_raw)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="sort_order must be an integer") from exc

    return {
        "provider_model_id": provider_model_id,
        "label": label,
        "provider_slug": provider_slug,
        "model_id": model_id,
        "qualified_model": qualified_model,
        "api_base": _trim_to_none(payload.get("api_base")),
        "auth_kind": auth_kind,
        "config_jsonb": config_jsonb,
        "capabilities_jsonb": capabilities_jsonb,
        "enabled": bool(payload.get("enabled", True)),
        "sort_order": sort_order,
        "notes": _trim_to_none(payload.get("notes")),
    }


def list_provider_definitions(*, include_disabled: bool = True) -> list[dict[str, Any]]:
    sb = get_supabase_admin()
    rows = sb.table("blockdata_ai_provider_registry").select("*").execute().data or []
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
        sb.table("blockdata_ai_provider_registry")
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
    result = sb.table("blockdata_ai_provider_registry").insert(insert_payload).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to create provider definition")
    return str(rows[0]["provider_slug"])


def update_provider_definition(*, user_id: str, provider_slug: str, payload: dict[str, Any]) -> str:
    sb = get_supabase_admin()
    current = (
        sb.table("blockdata_ai_provider_registry")
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
        sb.table("blockdata_ai_provider_registry")
        .update(update_payload)
        .eq("provider_slug", provider_slug)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Provider definition not found")
    return str(rows[0]["provider_slug"])


def list_provider_models(
    *,
    provider_slug: str | None = None,
    enabled: bool | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    rows = (
        sb.table("blockdata_ai_provider_models")
        .select("*")
        .order("sort_order")
        .order("label")
        .execute()
        .data
        or []
    )
    providers_by_slug = {
        provider["provider_slug"]: provider
        for provider in list_provider_definitions(include_disabled=True)
    }
    normalized = [
        _normalize_provider_model_row(row, providers_by_slug.get(row["provider_slug"]))
        for row in rows
    ]
    filtered = normalized
    if provider_slug:
        filtered = [row for row in filtered if row["provider_slug"] == provider_slug]
    if enabled is not None:
        filtered = [row for row in filtered if row["enabled"] is enabled]
    if search:
        needle = search.strip().lower()
        if needle:
            filtered = [
                row
                for row in filtered
                if needle in row["label"].lower()
                or needle in row["provider_display_name"].lower()
                or needle in row["qualified_model"].lower()
                or needle in row["model_id"].lower()
            ]
    return {
        "items": filtered[offset : offset + limit],
        "total": len(filtered),
        "limit": limit,
        "offset": offset,
    }


def create_provider_model(*, user_id: str, payload: dict[str, Any]) -> str:
    sb = get_supabase_admin()
    insert_payload = _validate_provider_model_payload(payload)
    insert_payload["updated_at"] = _utc_now_iso()
    result = sb.table("blockdata_ai_provider_models").insert(insert_payload).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to create provider model")
    return str(rows[0]["provider_model_id"])


def update_provider_model(*, user_id: str, provider_model_id: str, payload: dict[str, Any]) -> str:
    sb = get_supabase_admin()
    current = (
        sb.table("blockdata_ai_provider_models")
        .select("*")
        .eq("provider_model_id", provider_model_id)
        .maybe_single()
        .execute()
        .data
    )
    if current is None:
        raise HTTPException(status_code=404, detail="Provider model not found")

    merged = {
        "label": payload.get("label", current.get("label")),
        "provider_slug": payload.get("provider_slug", current.get("provider_slug")),
        "model_id": payload.get("model_id", current.get("model_id")),
        "qualified_model": payload.get("qualified_model", current.get("qualified_model")),
        "api_base": payload.get("api_base", current.get("api_base")),
        "auth_kind": payload.get("auth_kind", current.get("auth_kind")),
        "config_jsonb": payload.get("config_jsonb", current.get("config_jsonb") or {}),
        "capabilities_jsonb": payload.get(
            "capabilities_jsonb",
            current.get("capabilities_jsonb") or {},
        ),
        "enabled": payload.get("enabled", current.get("enabled", True)),
        "sort_order": payload.get("sort_order", current.get("sort_order", 100)),
        "notes": payload.get("notes", current.get("notes")),
    }
    update_payload = _validate_provider_model_payload(
        merged,
        provider_model_id=provider_model_id,
        current_provider_slug=current.get("provider_slug"),
    )
    update_payload["updated_at"] = _utc_now_iso()
    result = (
        sb.table("blockdata_ai_provider_models")
        .update(update_payload)
        .eq("provider_model_id", provider_model_id)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Provider model not found")
    return str(rows[0]["provider_model_id"])
