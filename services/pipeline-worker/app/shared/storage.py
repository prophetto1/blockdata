"""Supabase Storage helpers for file I/O."""

from typing import Any

import httpx


async def upload_to_storage(
    supabase_url: str,
    supabase_key: str,
    bucket: str,
    path: str,
    content: bytes,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload bytes to Supabase Storage. Returns the public URL."""
    url = f"{supabase_url}/storage/v1/object/{bucket}/{path}"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            content=content,
            headers={
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": content_type,
            },
        )
        resp.raise_for_status()
    return f"{supabase_url}/storage/v1/object/public/{bucket}/{path}"


async def download_from_storage(
    supabase_url: str,
    supabase_key: str,
    bucket: str,
    path: str,
) -> bytes:
    """Download bytes from Supabase Storage."""
    url = f"{supabase_url}/storage/v1/object/{bucket}/{path}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            url,
            headers={"Authorization": f"Bearer {supabase_key}"},
        )
        resp.raise_for_status()
    return resp.content
