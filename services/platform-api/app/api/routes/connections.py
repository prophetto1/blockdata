"""Generic connection management — connect, disconnect, list, test.

All new connection types go through this route. The existing Deno
provider-connections edge function stays for backward compat with the
GCP Vertex SA connection but is NOT extended further.
"""
import json as json_mod
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.plugins.registry import resolve, resolve_by_function_name
from app.infra.connection import resolve_connection_sync
from app.infra.crypto import encrypt_with_context, get_envelope_key
from app.infra.supabase_client import get_supabase_admin

logger = logging.getLogger("connections")
router = APIRouter(prefix="/connections", tags=["connections"])

CRYPTO_CONTEXT = "provider-connections-v1"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ConnectRequest(BaseModel):
    provider: str
    connection_type: str
    credentials: dict[str, Any]
    metadata: dict[str, Any] = Field(default_factory=dict)


class DisconnectRequest(BaseModel):
    provider: str
    connection_type: str


class TestConnectionRequest(BaseModel):
    connection_id: str
    function_name: str


@router.get("", summary="List user connections")
async def list_connections(auth: AuthPrincipal = Depends(require_user_auth)):
    sb = get_supabase_admin()
    result = sb.table("user_provider_connections").select(
        "id, user_id, provider, connection_type, status, metadata_jsonb, created_at, updated_at"
    ).eq("user_id", auth.user_id).execute()
    return {"connections": result.data or []}


@router.post("/connect", summary="Save encrypted credentials for a provider")
async def connect(body: ConnectRequest, auth: AuthPrincipal = Depends(require_user_auth)):
    sb = get_supabase_admin()
    encrypted = encrypt_with_context(
        json_mod.dumps(body.credentials), get_envelope_key(), CRYPTO_CONTEXT
    )

    result = sb.table("user_provider_connections").upsert({
        "user_id": auth.user_id,
        "provider": body.provider,
        "connection_type": body.connection_type,
        "status": "connected",
        "credential_encrypted": encrypted,
        "metadata_jsonb": body.metadata,
        "updated_at": _now(),
    }, on_conflict="user_id,provider,connection_type").execute()

    if not result.data:
        raise HTTPException(400, "Failed to save connection")

    return {"ok": True, "status": "connected", "metadata": body.metadata}


@router.post("/disconnect", summary="Revoke a saved connection")
async def disconnect(body: DisconnectRequest, auth: AuthPrincipal = Depends(require_user_auth)):
    sb = get_supabase_admin()
    sb.table("user_provider_connections").update({
        "status": "disconnected",
        "credential_encrypted": None,
        "updated_at": _now(),
    }).eq("user_id", auth.user_id).eq(
        "provider", body.provider
    ).eq("connection_type", body.connection_type).execute()
    return {"ok": True, "status": "disconnected"}


@router.post("/test", summary="Test a saved connection via plugin probe")
async def test_connection(body: TestConnectionRequest, auth: AuthPrincipal = Depends(require_user_auth)):
    """Test a saved connection by calling the plugin's test_connection method."""
    creds = resolve_connection_sync(body.connection_id, auth.user_id)

    task_type = resolve_by_function_name(body.function_name)
    if not task_type:
        raise HTTPException(400, f"Function '{body.function_name}' not found")

    plugin = resolve(task_type)
    if not plugin:
        raise HTTPException(400, f"No handler for '{body.function_name}'")

    result = await plugin.test_connection(creds)
    return {"valid": result.state == "SUCCESS", "data": result.data}
