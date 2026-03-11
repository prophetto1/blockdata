"""Shared HTTP helpers for uploads and callbacks."""

from typing import Any, Optional

import httpx


async def upload_bytes(signed_upload_url: str, payload: bytes, content_type: str) -> None:
    """PUT bytes to a Supabase signed upload URL."""
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.put(signed_upload_url, content=payload, headers={"Content-Type": content_type})
        if resp.status_code >= 300:
            raise RuntimeError(f"Upload failed: HTTP {resp.status_code} {resp.text[:500]}")


async def post_callback(callback_url: str, payload: dict[str, Any], shared_secret: str) -> None:
    """POST JSON callback with auth header."""
    async with httpx.AsyncClient(timeout=30) as client:
        await client.post(
            callback_url,
            json=payload,
            headers={"X-Conversion-Service-Key": shared_secret},
        )


async def download_bytes(url: str) -> bytes:
    """GET bytes from a URL."""
    async with httpx.AsyncClient(timeout=180) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content


def append_token_if_needed(url: str, token: Optional[str]) -> str:
    """Append token query param to signed URL if not already present."""
    if not token or "token=" in url:
        return url
    join = "&" if "?" in url else "?"
    return f"{url}{join}token={token}"
