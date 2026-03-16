"""Traced from Java imports in MongoDbConnection.java:

  MongoDbConnection.client(RunContext)  → _connect() in mongodb.py
  MongoClients.create(uri)             → pymongo.MongoClient(uri)

But the URI has to come from somewhere. In Kestra, it's a Property<String>
in the flow YAML. In BD, credentials are stored encrypted in the database
and resolved at runtime via connection_id.

This file bridges both patterns:
  - Kestra-native: URI passed directly in params
  - BD-native: connection_id → DB lookup → decrypt → URI

Traced from BD's existing infra:
  app/infra/connection.py   → resolve_connection_sync()
  app/infra/crypto.py       → AES-GCM decrypt
  app/infra/auth_providers.py → resolve_auth()
"""
from __future__ import annotations

import os
from typing import Any


def resolve_connection_sync(connection_id: str, user_id: str) -> dict[str, Any]:
    """Fetch and decrypt credentials from user_provider_connections table.

    In platform-api, this does:
      1. Query Supabase for connection_id + user_id
      2. AES-GCM decrypt the credentials blob
      3. Return plain dict with keys like uri, username, password, etc.

    Here we provide a standalone version that reads from env vars
    for testing, or delegates to platform-api's infra when available.
    """
    # Try platform-api's real resolver first
    try:
        from app.infra.connection import resolve_connection_sync as _real
        return _real(connection_id, user_id)
    except ImportError:
        pass

    # Standalone fallback: read from env vars
    # e.g. CONNECTION_mongo1_URI=mongodb://localhost:27017
    prefix = f"CONNECTION_{connection_id}_"
    creds = {}
    for key, value in os.environ.items():
        if key.startswith(prefix):
            field = key[len(prefix):].lower()
            creds[field] = value
    if not creds:
        raise ValueError(
            f"No credentials for connection_id={connection_id}. "
            f"Set env vars like {prefix}URI=mongodb://... or run inside platform-api."
        )
    return creds
