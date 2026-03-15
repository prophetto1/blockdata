"""Resolve user-scoped credentials from user_provider_connections."""
import json
import os
from typing import Any

from .supabase_client import get_supabase_admin
from .crypto import decrypt_with_context


def resolve_connection_sync(connection_id: str, user_id: str) -> dict[str, Any]:
    """Fetch and decrypt credentials for a provider connection row.

    Verifies the connection belongs to the authenticated user before
    returning decrypted credentials. This is a security boundary —
    callers MUST pass the authenticated user_id.

    Returns the decrypted credential dict merged with metadata_jsonb.
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

    secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    credential_json = decrypt_with_context(row["credential_encrypted"], secret, "provider-connections-v1")
    creds = json.loads(credential_json)

    metadata = row.get("metadata_jsonb") or {}
    return {**metadata, **creds}
