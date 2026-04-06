from __future__ import annotations

import json
from typing import Any

import httpx
from fastapi import HTTPException
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import service_account

from app.domain.agchain.organization_access import (
    require_organization_membership,
    require_organization_permission,
)
from app.domain.agchain.project_access import require_project_access, require_project_write_access
from app.infra.crypto import encrypt_with_context, decrypt_with_fallback, get_envelope_key
from app.infra.supabase_client import get_supabase_admin

from .provider_registry import list_supported_providers, resolve_provider_definition


AGCHAIN_PROVIDER_CREDENTIALS_CONTEXT = "agchain-provider-credentials-v1"
VERTEX_DEFAULT_LOCATION = "us-central1"
VERTEX_EXPRESS_BASE_URL = "https://aiplatform.googleapis.com"
VERTEX_PROBE_MODEL = "gemini-2.5-flash"


def _trim_to_none(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    return trimmed or None


def _utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


def _load_project_row(*, project_id: str, sb) -> dict[str, Any]:
    row = (
        sb.table("user_projects")
        .select("*")
        .eq("project_id", project_id)
        .maybe_single()
        .execute()
        .data
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return row


def _normalize_headers(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    normalized: list[dict[str, str]] = []
    for row in value:
        if not isinstance(row, dict):
            continue
        key = _trim_to_none(row.get("key"))
        header_value = _trim_to_none(row.get("value"))
        if key or header_value:
            normalized.append({"key": key or "", "value": header_value or ""})
    return normalized


def _normalize_models(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    normalized: list[dict[str, str]] = []
    for row in value:
        if not isinstance(row, dict):
            continue
        model_value = _trim_to_none(row.get("value"))
        if model_value:
            normalized.append({"value": model_value})
    return normalized


def _validate_basic_api_payload(payload: dict[str, Any]) -> dict[str, Any]:
    api_key = _trim_to_none(payload.get("api_key"))
    if not api_key:
        raise HTTPException(status_code=422, detail="api_key is required")
    return {"api_key": api_key}


def _validate_vertex_payload(payload: dict[str, Any]) -> dict[str, Any]:
    provider_mode = _trim_to_none(payload.get("provider_mode")) or "standard"
    if provider_mode not in {"standard", "express"}:
        raise HTTPException(status_code=422, detail="provider_mode is invalid")

    auth_mode = _trim_to_none(payload.get("auth_mode")) or ("api_key" if provider_mode == "express" else "access_token")
    if auth_mode not in {"access_token", "credential_json", "api_key"}:
        raise HTTPException(status_code=422, detail="auth_mode is invalid")
    if provider_mode == "express" and auth_mode != "api_key":
        raise HTTPException(status_code=422, detail="express mode requires api_key auth_mode")

    project = _trim_to_none(payload.get("project"))
    location = _trim_to_none(payload.get("location")) or VERTEX_DEFAULT_LOCATION
    access_token = _trim_to_none(payload.get("access_token"))
    credential_json = payload.get("credential_json")
    api_key = _trim_to_none(payload.get("api_key"))

    normalized: dict[str, Any] = {
        "provider_mode": provider_mode,
        "auth_mode": auth_mode,
        "project": project,
        "location": location,
        "supports_streaming": bool(payload.get("supports_streaming", True)),
        "include_default_registry": bool(payload.get("include_default_registry", True)),
        "headers": _normalize_headers(payload.get("headers")),
        "models": _normalize_models(payload.get("models")),
    }

    if auth_mode == "access_token":
        if not access_token:
            raise HTTPException(status_code=422, detail="access_token is required")
        normalized["access_token"] = access_token
    elif auth_mode == "credential_json":
        if not isinstance(credential_json, str) or not credential_json.strip():
            raise HTTPException(status_code=422, detail="credential_json is required")
        try:
            credential_data = json.loads(credential_json)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=422, detail="credential_json must be valid JSON") from exc
        if not isinstance(credential_data, dict):
            raise HTTPException(status_code=422, detail="credential_json must decode to an object")
        normalized["credential_json"] = json.dumps(credential_data)
    else:
        if not api_key:
            raise HTTPException(status_code=422, detail="api_key is required")
        normalized["api_key"] = api_key

    if provider_mode == "standard" and not project:
        raise HTTPException(status_code=422, detail="project is required for standard Vertex AI mode")

    return normalized


def validate_provider_credential_payload(provider_slug: str, payload: dict[str, Any]) -> dict[str, Any]:
    provider_definition = resolve_provider_definition(provider_slug)
    if provider_definition is None:
        raise HTTPException(status_code=404, detail="Provider definition not found")

    form_kind = provider_definition["credential_form_kind"]
    if form_kind == "basic_api_key":
        return _validate_basic_api_payload(payload)
    if form_kind == "vertex_ai":
        return _validate_vertex_payload(payload)
    raise HTTPException(status_code=422, detail=f"Unsupported credential_form_kind: {form_kind}")


def _encrypt_payload(payload: dict[str, Any]) -> str:
    return encrypt_with_context(
        json.dumps(payload),
        get_envelope_key(),
        AGCHAIN_PROVIDER_CREDENTIALS_CONTEXT,
    )


def _decrypt_payload(encrypted_payload: str) -> dict[str, Any]:
    plaintext = decrypt_with_fallback(encrypted_payload, AGCHAIN_PROVIDER_CREDENTIALS_CONTEXT)
    try:
        decoded = json.loads(plaintext)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Stored provider credential payload is invalid") from exc
    if not isinstance(decoded, dict):
        raise HTTPException(status_code=500, detail="Stored provider credential payload must be an object")
    return decoded


def _sanitize_credential_config(provider_slug: str, payload: dict[str, Any] | None) -> dict[str, Any] | None:
    if payload is None:
        return None
    provider_definition = resolve_provider_definition(provider_slug)
    if provider_definition is None:
        return None
    form_kind = provider_definition["credential_form_kind"]
    if form_kind == "basic_api_key":
        return {}
    if form_kind == "vertex_ai":
        return {
            "provider_mode": payload.get("provider_mode"),
            "auth_mode": payload.get("auth_mode"),
            "project": payload.get("project"),
            "location": payload.get("location"),
            "supports_streaming": payload.get("supports_streaming"),
            "include_default_registry": payload.get("include_default_registry"),
            "headers": payload.get("headers") or [],
            "models": payload.get("models") or [],
        }
    return None


def _organization_credential_rows(*, organization_id: str, sb) -> dict[str, dict[str, Any]]:
    rows = (
        sb.table("agchain_organization_provider_credentials")
        .select("*")
        .eq("organization_id", organization_id)
        .execute()
        .data
        or []
    )
    return {
        row["provider_slug"]: row
        for row in rows
        if row.get("provider_slug")
    }


def _project_credential_rows(*, project_id: str, sb) -> dict[str, dict[str, Any]]:
    rows = (
        sb.table("agchain_project_provider_credentials")
        .select("*")
        .eq("project_id", project_id)
        .execute()
        .data
        or []
    )
    return {
        row["provider_slug"]: row
        for row in rows
        if row.get("provider_slug")
    }


def list_organization_model_providers(*, user_id: str, organization_id: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_organization_membership(user_id=user_id, organization_id=organization_id, sb=sb)
    providers = list_supported_providers(include_disabled=False)
    credential_rows = _organization_credential_rows(organization_id=organization_id, sb=sb)
    return {
        "items": [
            {
                **provider,
                "credential_status": "set" if provider["provider_slug"] in credential_rows else "not_set",
                "effective_source": "organization" if provider["provider_slug"] in credential_rows else "none",
                "last_updated_at": credential_rows.get(provider["provider_slug"], {}).get("updated_at"),
                "has_local_override": False,
                "credential_config": _sanitize_credential_config(
                    provider["provider_slug"],
                    _decrypt_payload(credential_rows[provider["provider_slug"]]["credential_payload_encrypted"])
                    if provider["provider_slug"] in credential_rows
                    else None,
                ),
            }
            for provider in providers
        ]
    }


def list_project_model_providers(*, user_id: str, project_id: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    project = require_project_access(user_id=user_id, project_id=project_id, sb=sb)
    providers = list_supported_providers(include_disabled=False)
    org_rows = _organization_credential_rows(organization_id=project["organization_id"], sb=sb)
    project_rows = _project_credential_rows(project_id=project_id, sb=sb)
    items: list[dict[str, Any]] = []
    for provider in providers:
        provider_slug = provider["provider_slug"]
        local_row = project_rows.get(provider_slug)
        org_row = org_rows.get(provider_slug)
        if local_row is not None:
            credential_status = "set"
            effective_source = "project"
            last_updated_at = local_row.get("updated_at")
            credential_config = _sanitize_credential_config(
                provider_slug,
                _decrypt_payload(local_row["credential_payload_encrypted"]),
            )
        elif org_row is not None:
            credential_status = "inherited"
            effective_source = "organization"
            last_updated_at = org_row.get("updated_at")
            credential_config = _sanitize_credential_config(
                provider_slug,
                _decrypt_payload(org_row["credential_payload_encrypted"]),
            )
        else:
            credential_status = "not_set"
            effective_source = "none"
            last_updated_at = None
            credential_config = None
        items.append(
            {
                **provider,
                "credential_status": credential_status,
                "effective_source": effective_source,
                "last_updated_at": last_updated_at,
                "has_local_override": local_row is not None,
                "credential_config": credential_config,
            }
        )
    return {"items": items}


def upsert_organization_model_provider_credential(
    *,
    user_id: str,
    organization_id: str,
    provider_slug: str,
    credential_payload: dict[str, Any],
) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.settings.manage",
        sb=sb,
    )
    normalized_payload = validate_provider_credential_payload(provider_slug, credential_payload)
    sb.table("agchain_organization_provider_credentials").upsert(
        {
            "organization_id": organization_id,
            "provider_slug": provider_slug,
            "credential_payload_encrypted": _encrypt_payload(normalized_payload),
            "updated_at": _utc_now_iso(),
        },
        on_conflict="organization_id,provider_slug",
    ).execute()
    return {"provider_slug": provider_slug, "credential_status": "set"}


def delete_organization_model_provider_credential(
    *,
    user_id: str,
    organization_id: str,
    provider_slug: str,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.settings.manage",
        sb=sb,
    )
    (
        sb.table("agchain_organization_provider_credentials")
        .delete()
        .eq("organization_id", organization_id)
        .eq("provider_slug", provider_slug)
        .execute()
    )
    return {"provider_slug": provider_slug, "credential_status": "not_set"}


def upsert_project_model_provider_credential(
    *,
    user_id: str,
    project_id: str,
    provider_slug: str,
    credential_payload: dict[str, Any],
) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_project_write_access(user_id=user_id, project_id=project_id, sb=sb)
    normalized_payload = validate_provider_credential_payload(provider_slug, credential_payload)
    sb.table("agchain_project_provider_credentials").upsert(
        {
            "project_id": project_id,
            "provider_slug": provider_slug,
            "credential_payload_encrypted": _encrypt_payload(normalized_payload),
            "updated_at": _utc_now_iso(),
        },
        on_conflict="project_id,provider_slug",
    ).execute()
    return {"provider_slug": provider_slug, "credential_status": "set"}


def delete_project_model_provider_credential(
    *,
    user_id: str,
    project_id: str,
    provider_slug: str,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    project = require_project_write_access(user_id=user_id, project_id=project_id, sb=sb)
    (
        sb.table("agchain_project_provider_credentials")
        .delete()
        .eq("project_id", project_id)
        .eq("provider_slug", provider_slug)
        .execute()
    )
    org_has_default = (
        sb.table("agchain_organization_provider_credentials")
        .select("provider_slug")
        .eq("organization_id", project["organization_id"])
        .eq("provider_slug", provider_slug)
        .limit(1)
        .execute()
        .data
        or []
    )
    return {
        "provider_slug": provider_slug,
        "credential_status": "inherited" if org_has_default else "not_set",
    }


async def _probe_basic_api_provider(provider_slug: str, api_key: str) -> dict[str, Any]:
    if provider_slug == "openai":
        url = "https://api.openai.com/v1/models"
        headers = {"Authorization": f"Bearer {api_key}"}
    elif provider_slug == "anthropic":
        url = "https://api.anthropic.com/v1/models"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        }
    else:
        raise HTTPException(status_code=422, detail=f"Unsupported basic api probe for provider: {provider_slug}")

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, headers=headers)

    if response.status_code < 400:
        return {"result": "success", "message": "Credential validated successfully."}

    return {
        "result": "error",
        "message": f"Validation failed with HTTP {response.status_code}.",
    }


def _vertex_base_url(payload: dict[str, Any]) -> str:
    provider_mode = payload["provider_mode"]
    if provider_mode == "express":
        return VERTEX_EXPRESS_BASE_URL
    location = payload.get("location") or VERTEX_DEFAULT_LOCATION
    if str(location).lower() == "global":
        return VERTEX_EXPRESS_BASE_URL
    return f"https://{location}-aiplatform.googleapis.com"


def _vertex_auth_headers(payload: dict[str, Any]) -> dict[str, str]:
    auth_mode = payload["auth_mode"]
    if auth_mode == "api_key":
        return {"x-goog-api-key": payload["api_key"]}
    if auth_mode == "access_token":
        return {"Authorization": f"Bearer {payload['access_token']}"}
    credential_info = json.loads(payload["credential_json"])
    credentials = service_account.Credentials.from_service_account_info(
        credential_info,
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    credentials.refresh(GoogleAuthRequest())
    return {"Authorization": f"Bearer {credentials.token}"}


async def _probe_vertex_ai(payload: dict[str, Any]) -> dict[str, Any]:
    url = f"{_vertex_base_url(payload)}/v1/publishers/google/models/{VERTEX_PROBE_MODEL}"
    headers = _vertex_auth_headers(payload)
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, headers=headers)

    if response.status_code < 400:
        return {"result": "success", "message": "Credential validated successfully."}
    return {
        "result": "error",
        "message": f"Validation failed with HTTP {response.status_code}.",
    }


async def test_organization_model_provider_credential(
    *,
    user_id: str,
    organization_id: str,
    provider_slug: str,
    credential_payload: dict[str, Any],
) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.settings.manage",
        sb=sb,
    )
    normalized_payload = validate_provider_credential_payload(provider_slug, credential_payload)
    provider_definition = resolve_provider_definition(provider_slug)
    if provider_definition is None:
        raise HTTPException(status_code=404, detail="Provider definition not found")
    result = (
        await _probe_basic_api_provider(provider_slug, normalized_payload["api_key"])
        if provider_definition["credential_form_kind"] == "basic_api_key"
        else await _probe_vertex_ai(normalized_payload)
    )
    return {"provider_slug": provider_slug, **result}


async def test_project_model_provider_credential(
    *,
    user_id: str,
    project_id: str,
    provider_slug: str,
    credential_payload: dict[str, Any],
) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_project_write_access(user_id=user_id, project_id=project_id, sb=sb)
    normalized_payload = validate_provider_credential_payload(provider_slug, credential_payload)
    provider_definition = resolve_provider_definition(provider_slug)
    if provider_definition is None:
        raise HTTPException(status_code=404, detail="Provider definition not found")
    result = (
        await _probe_basic_api_provider(provider_slug, normalized_payload["api_key"])
        if provider_definition["credential_form_kind"] == "basic_api_key"
        else await _probe_vertex_ai(normalized_payload)
    )
    return {"provider_slug": provider_slug, **result}


def load_stored_organization_provider_credential_payload(
    *,
    organization_id: str,
    provider_slug: str,
) -> dict[str, Any] | None:
    sb = get_supabase_admin()
    row = (
        sb.table("agchain_organization_provider_credentials")
        .select("credential_payload_encrypted")
        .eq("organization_id", organization_id)
        .eq("provider_slug", provider_slug)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not row:
        return None
    return _decrypt_payload(row[0]["credential_payload_encrypted"])


def load_stored_project_provider_credential_payload(
    *,
    project_id: str,
    provider_slug: str,
) -> dict[str, Any] | None:
    sb = get_supabase_admin()
    row = (
        sb.table("agchain_project_provider_credentials")
        .select("credential_payload_encrypted")
        .eq("project_id", project_id)
        .eq("provider_slug", provider_slug)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not row:
        return None
    return _decrypt_payload(row[0]["credential_payload_encrypted"])
