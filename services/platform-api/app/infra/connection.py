"""Resolve user-scoped credentials from user_provider_connections."""
import asyncio
import json
from typing import Any

from .crypto import decrypt_with_fallback
from .supabase_client import get_supabase_admin

SAFE_CONNECTION_METADATA_KEYS = frozenset({"endpoint", "database", "project_id", "region"})


def _merge_connection_metadata(
    creds: dict[str, Any], metadata: dict[str, Any] | None
) -> dict[str, Any]:
    merged = dict(creds)
    if not isinstance(metadata, dict):
        return merged

    for key in SAFE_CONNECTION_METADATA_KEYS:
        if key in metadata and key not in merged:
            merged[key] = metadata[key]
    return merged


def resolve_connection_sync(connection_id: str, user_id: str) -> dict[str, Any]:
    """Fetch and decrypt credentials for a provider connection row.

    Verifies the connection belongs to the authenticated user before
    returning decrypted credentials. This is a security boundary —
    callers MUST pass the authenticated user_id.

    Returns the decrypted credential dict plus a safe subset of metadata_jsonb.
    """
    sb = get_supabase_admin()
    result = sb.table("user_provider_connections").select(
        "credential_encrypted, metadata_jsonb, provider, connection_type, status, user_id"
    ).eq("id", connection_id).single().execute()

    row = result.data
    if not row:
        raise ValueError(f"Connection {connection_id} not found")
    if row.get("user_id") != user_id:
        raise PermissionError(f"Connection {connection_id} does not belong to user")
    if row.get("status") != "connected":
        raise ValueError(f"Connection {connection_id} is {row.get('status')}")

    credential_json = decrypt_with_fallback(
        row["credential_encrypted"], "provider-connections-v1"
    )
    creds = json.loads(credential_json)

    metadata = row.get("metadata_jsonb") or {}
    return _merge_connection_metadata(creds, metadata)


async def resolve_connection(connection_id: str, user_id: str) -> dict[str, Any]:
    """Resolve a connection without blocking the event loop."""
    return await asyncio.to_thread(resolve_connection_sync, connection_id, user_id)
