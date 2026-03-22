"""User-scoped variables metadata and encrypted value storage."""

import os
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.infra.crypto import encrypt_with_context
from app.infra.supabase_client import get_supabase_admin

router = APIRouter(prefix="/variables", tags=["variables"])

CRYPTO_CONTEXT = "user-variables-v1"
METADATA_COLUMNS = "id,name,description,value_kind,value_suffix,created_at,updated_at"


def _derive_suffix(value: str) -> str:
    text = str(value or "")
    if not text:
        return ""
    return f"....{text[-4:]}" if len(text) >= 4 else f"....{text}"


class VariableMetadata(BaseModel):
    id: str
    name: str
    description: str | None = None
    value_kind: str
    value_suffix: str | None = None
    created_at: str
    updated_at: str


class ListVariablesResponse(BaseModel):
    variables: list[VariableMetadata]


class VariableResponse(BaseModel):
    variable: VariableMetadata


class CreateVariableRequest(BaseModel):
    name: str = Field(min_length=1)
    value: str
    description: str | None = None
    value_kind: str = Field(default="secret")


class UpdateVariableRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    value: str | None = None
    description: str | None = None
    value_kind: str | None = None


class DeleteVariableResponse(BaseModel):
    ok: Literal[True]
    id: str


@router.get("", response_model=ListVariablesResponse, summary="List current user variables")
async def list_variables(auth: AuthPrincipal = Depends(require_user_auth)):
    sb = get_supabase_admin()
    result = (
        sb.table("user_variables")
        .select(METADATA_COLUMNS)
        .eq("user_id", auth.user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return {"variables": result.data or []}


@router.post("", response_model=VariableResponse, summary="Create a user variable")
async def create_variable(body: CreateVariableRequest, auth: AuthPrincipal = Depends(require_user_auth)):
    sb = get_supabase_admin()
    secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    encrypted = encrypt_with_context(body.value, secret, CRYPTO_CONTEXT)
    payload = {
        "user_id": auth.user_id,
        "name": body.name,
        "description": body.description,
        "value_kind": body.value_kind,
        "value_suffix": _derive_suffix(body.value),
        "value_encrypted": encrypted,
    }
    result = sb.table("user_variables").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create variable")
    return {"variable": result.data[0]}


@router.patch("/{variable_id}", response_model=VariableResponse, summary="Update a user variable")
async def update_variable(
    variable_id: str,
    body: UpdateVariableRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    sb = get_supabase_admin()
    updates = body.model_dump(exclude_none=True)
    if "value" in updates:
        secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        updates["value_encrypted"] = encrypt_with_context(updates.pop("value"), secret, CRYPTO_CONTEXT)
        updates["value_suffix"] = _derive_suffix(body.value or "")
    result = (
        sb.table("user_variables")
        .update(updates)
        .eq("id", variable_id)
        .eq("user_id", auth.user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Variable not found")
    return {"variable": result.data[0]}


@router.delete("/{variable_id}", response_model=DeleteVariableResponse, summary="Delete a user variable")
async def delete_variable(variable_id: str, auth: AuthPrincipal = Depends(require_user_auth)):
    sb = get_supabase_admin()
    result = (
        sb.table("user_variables")
        .delete()
        .eq("id", variable_id)
        .eq("user_id", auth.user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Variable not found")
    return {"ok": True, "id": variable_id}
