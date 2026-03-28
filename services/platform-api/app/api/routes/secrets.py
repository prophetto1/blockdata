"""Canonical user-scoped secrets metadata and encrypted value storage."""

import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from opentelemetry import metrics, trace
from pydantic import BaseModel, Field

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.infra.crypto import encrypt_with_context, get_envelope_key
from app.infra.supabase_client import get_supabase_admin
from app.observability.contract import (
    SECRETS_CHANGE_COUNTER_NAME,
    SECRETS_CHANGED_LOG_EVENT,
    SECRETS_CREATE_SPAN_NAME,
    SECRETS_DELETE_SPAN_NAME,
    SECRETS_LIST_COUNTER_NAME,
    SECRETS_LIST_SPAN_NAME,
    SECRETS_UPDATE_SPAN_NAME,
    safe_attributes,
)

router = APIRouter(prefix="/secrets", tags=["secrets"])
logger = logging.getLogger("secrets")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

secrets_list_counter = meter.create_counter(SECRETS_LIST_COUNTER_NAME)
secrets_change_counter = meter.create_counter(SECRETS_CHANGE_COUNTER_NAME)

CRYPTO_CONTEXT = "user-variables-v1"
METADATA_COLUMNS = "id,name,description,value_kind,value_suffix,created_at,updated_at"
SecretValueKind = Literal["secret", "token", "api_key", "client_secret", "webhook_secret"]


def _derive_suffix(value: str) -> str:
    text = str(value or "")
    if not text:
        return ""
    return f"....{text[-4:]}" if len(text) >= 4 else f"....{text}"


def _canonicalize_name(name: str) -> str:
    return name.strip().upper()


def _set_span_attrs(span, attrs: dict[str, object]) -> None:
    for key, value in safe_attributes(attrs).items():
        if value is not None:
            span.set_attribute(key, value)


def _log_secret_change(action: str, result: str, value_kind: str | None = None) -> None:
    attrs = {"action": action, "result": result, "value_kind": value_kind}
    logger.info(SECRETS_CHANGED_LOG_EVENT, extra=safe_attributes(attrs))


class SecretMetadata(BaseModel):
    id: str
    name: str
    description: str | None = None
    value_kind: str
    value_suffix: str | None = None
    created_at: str
    updated_at: str


class ListSecretsResponse(BaseModel):
    secrets: list[SecretMetadata]


class SecretResponse(BaseModel):
    secret: SecretMetadata


class CreateSecretRequest(BaseModel):
    name: str = Field(min_length=1)
    value: str
    description: str | None = None
    value_kind: SecretValueKind = "secret"


class UpdateSecretRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    value: str | None = None
    description: str | None = None
    value_kind: str | None = None


class DeleteSecretResponse(BaseModel):
    ok: Literal[True]
    id: str


@router.get("", response_model=ListSecretsResponse, summary="List current user secrets")
async def list_secrets(auth: AuthPrincipal = Depends(require_user_auth)):
    with tracer.start_as_current_span(SECRETS_LIST_SPAN_NAME) as span:
        sb = get_supabase_admin()
        result = (
            sb.table("user_variables")
            .select(METADATA_COLUMNS)
            .eq("user_id", auth.user_id)
            .order("updated_at", desc=True)
            .execute()
        )
        attrs = {"action": "list", "result": "ok"}
        _set_span_attrs(span, attrs)
        secrets_list_counter.add(1, safe_attributes(attrs))
        return {"secrets": result.data or []}


@router.post("", response_model=SecretResponse, summary="Create a user secret")
async def create_secret(
    body: CreateSecretRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span(SECRETS_CREATE_SPAN_NAME) as span:
        sb = get_supabase_admin()
        canonical_name = _canonicalize_name(body.name)
        encrypted = encrypt_with_context(body.value, get_envelope_key(), CRYPTO_CONTEXT)
        payload = {
            "user_id": auth.user_id,
            "name": canonical_name,
            "description": body.description,
            "value_kind": body.value_kind,
            "value_suffix": _derive_suffix(body.value),
            "value_encrypted": encrypted,
        }
        result = sb.table("user_variables").insert(payload).execute()
        if not result.data:
            attrs = {"action": "create", "result": "failed", "value_kind": body.value_kind}
            _set_span_attrs(span, attrs)
            span.set_attribute("http.status_code", 400)
            _log_secret_change("create", "failed", body.value_kind)
            raise HTTPException(status_code=400, detail="Failed to create secret")

        attrs = {"action": "create", "result": "ok", "value_kind": body.value_kind}
        _set_span_attrs(span, attrs)
        secrets_change_counter.add(1, safe_attributes(attrs))
        _log_secret_change("create", "ok", body.value_kind)
        return {"secret": result.data[0]}


@router.patch("/{secret_id}", response_model=SecretResponse, summary="Update a user secret")
async def update_secret(
    secret_id: str,
    body: UpdateSecretRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span(SECRETS_UPDATE_SPAN_NAME) as span:
        sb = get_supabase_admin()
        updates = body.model_dump(exclude_none=True)
        if "name" in updates:
            updates["name"] = _canonicalize_name(str(updates["name"]))
        if "value" in updates:
            updates["value_encrypted"] = encrypt_with_context(
                str(updates.pop("value")), get_envelope_key(), CRYPTO_CONTEXT
            )
            updates["value_suffix"] = _derive_suffix(body.value or "")

        result = (
            sb.table("user_variables")
            .update(updates)
            .eq("id", secret_id)
            .eq("user_id", auth.user_id)
            .execute()
        )
        if not result.data:
            attrs = {"action": "update", "result": "not_found", "value_kind": body.value_kind}
            _set_span_attrs(span, attrs)
            span.set_attribute("http.status_code", 404)
            _log_secret_change("update", "not_found", body.value_kind)
            raise HTTPException(status_code=404, detail="Secret not found")

        secret = result.data[0]
        attrs = {
            "action": "update",
            "result": "ok",
            "value_kind": secret.get("value_kind"),
        }
        _set_span_attrs(span, attrs)
        secrets_change_counter.add(1, safe_attributes(attrs))
        _log_secret_change("update", "ok", secret.get("value_kind"))
        return {"secret": secret}


@router.delete(
    "/{secret_id}",
    response_model=DeleteSecretResponse,
    summary="Delete a user secret",
)
async def delete_secret(secret_id: str, auth: AuthPrincipal = Depends(require_user_auth)):
    with tracer.start_as_current_span(SECRETS_DELETE_SPAN_NAME) as span:
        sb = get_supabase_admin()
        result = (
            sb.table("user_variables")
            .delete()
            .eq("id", secret_id)
            .eq("user_id", auth.user_id)
            .execute()
        )
        if not result.data:
            attrs = {"action": "delete", "result": "not_found"}
            _set_span_attrs(span, attrs)
            span.set_attribute("http.status_code", 404)
            _log_secret_change("delete", "not_found")
            raise HTTPException(status_code=404, detail="Secret not found")

        attrs = {"action": "delete", "result": "ok"}
        _set_span_attrs(span, attrs)
        secrets_change_counter.add(1, safe_attributes(attrs))
        _log_secret_change("delete", "ok")
        return {"ok": True, "id": secret_id}
