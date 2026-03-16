from __future__ import annotations

import os
from typing import Any


def resolve_connection_sync(connection_id: str, user_id: str | None = None) -> dict[str, Any]:
    try:
        from app.infra.connection import resolve_connection_sync as real_resolve_connection_sync

        return real_resolve_connection_sync(connection_id, user_id or "")
    except ImportError:
        pass

    prefix = f"CONNECTION_{connection_id}_"
    credentials: dict[str, Any] = {}
    for key, value in os.environ.items():
        if key.upper().startswith(prefix.upper()):
            field = key[len(prefix) :].lower()
            credentials[field] = value

    if credentials:
        return credentials

    raise ValueError(
        f"No credentials found for connection_id={connection_id}. "
        f"Set env vars like {prefix}URI=mongodb://... or run inside the platform runtime."
    )
