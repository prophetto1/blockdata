"""Traced from Java imports in Find.java and AbstractLoad.java:

  runContext.storage().putFile(tempFile)   → upload_to_storage()
  runContext.storage().getFile(from)       → download_from_storage()

Kestra uses StorageInterface (pluggable: local, S3, GCS, Azure, Minio).
BD uses Supabase Storage REST API.
Same purpose: store and retrieve artifacts between pipeline steps.
"""
from __future__ import annotations

import httpx


async def upload_to_storage(
    supabase_url: str,
    supabase_key: str,
    bucket: str,
    path: str,
    content: bytes,
) -> str:
    """StorageInterface.put(URI, InputStream) → upload bytes, return public URL."""
    url = f"{supabase_url}/storage/v1/object/{bucket}/{path}"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/octet-stream",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.put(url, content=content, headers=headers, timeout=120)
        resp.raise_for_status()
    return f"{supabase_url}/storage/v1/object/public/{bucket}/{path}"


async def download_from_storage(
    supabase_url: str,
    supabase_key: str,
    bucket: str,
    path: str,
) -> bytes:
    """StorageInterface.get(URI) → download bytes."""
    url = f"{supabase_url}/storage/v1/object/{bucket}/{path}"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers, timeout=120)
        resp.raise_for_status()
        return resp.content


async def list_storage(
    supabase_url: str,
    supabase_key: str,
    bucket: str,
    prefix: str,
) -> list[dict]:
    """StorageInterface.list(prefix) → list files."""
    url = f"{supabase_url}/storage/v1/object/list/{bucket}"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json={"prefix": prefix}, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json()


async def delete_from_storage(
    supabase_url: str,
    supabase_key: str,
    bucket: str,
    paths: list[str],
) -> None:
    """StorageInterface.delete(URI) → delete files."""
    url = f"{supabase_url}/storage/v1/object/{bucket}"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.delete(url, json={"prefixes": paths}, headers=headers, timeout=30)
        resp.raise_for_status()
