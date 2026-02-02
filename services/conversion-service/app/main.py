from __future__ import annotations

import os
from typing import Any, Optional

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field


class OutputTarget(BaseModel):
    bucket: str
    key: str
    signed_upload_url: str
    token: Optional[str] = None


class ConvertRequest(BaseModel):
    source_uid: str
    conversion_job_id: str
    source_type: str = Field(pattern=r"^(docx|pdf|txt)$")
    source_download_url: str
    output: OutputTarget
    callback_url: str


app = FastAPI()


def _require_shared_secret(x_conversion_service_key: Optional[str]) -> None:
    expected = os.environ.get("CONVERSION_SERVICE_KEY")
    if not expected:
        raise RuntimeError("CONVERSION_SERVICE_KEY is not set")
    if not x_conversion_service_key or x_conversion_service_key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


async def _post_callback(
    callback_url: str,
    payload: dict[str, Any],
    shared_secret: str,
) -> None:
    async with httpx.AsyncClient(timeout=30) as client:
        await client.post(
            callback_url,
            json=payload,
            headers={"X-Conversion-Service-Key": shared_secret},
        )


async def _upload_markdown(signed_upload_url: str, markdown_bytes: bytes) -> None:
    # Supabase signed upload URLs sometimes require a token query parameter.
    # If the URL already contains token=, we leave it as-is.
    headers = {
        "Content-Type": "text/markdown; charset=utf-8",
    }
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.put(signed_upload_url, content=markdown_bytes, headers=headers)
        if resp.status_code >= 300:
            raise RuntimeError(f"Upload failed: HTTP {resp.status_code} {resp.text[:500]}")


async def _convert_to_markdown(req: ConvertRequest) -> bytes:
    if req.source_type == "txt":
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.get(req.source_download_url)
            r.raise_for_status()
            # Best-effort UTF-8 decode; keep bytes if already utf-8.
            text = r.content.decode("utf-8", errors="replace")
            return text.encode("utf-8")

    # docx/pdf via Docling using the signed URL directly.
    try:
        from docling.document_converter import DocumentConverter
    except Exception as e:  # pragma: no cover
        raise RuntimeError(f"Docling import failed: {e!r}") from e

    converter = DocumentConverter()
    result = converter.convert(req.source_download_url)
    md = result.document.export_to_markdown()
    return md.encode("utf-8")


@app.post("/convert")
async def convert(
    body: ConvertRequest,
    x_conversion_service_key: Optional[str] = Header(default=None),
):
    _require_shared_secret(x_conversion_service_key)
    shared_secret = os.environ["CONVERSION_SERVICE_KEY"]

    callback_payload: dict[str, Any] = {
        "source_uid": body.source_uid,
        "conversion_job_id": body.conversion_job_id,
        "md_key": body.output.key,
        "success": False,
        "error": None,
    }

    try:
        markdown_bytes = await _convert_to_markdown(body)
        upload_url = body.output.signed_upload_url
        if body.output.token and "token=" not in upload_url:
            join = "&" if "?" in upload_url else "?"
            upload_url = f"{upload_url}{join}token={body.output.token}"
        await _upload_markdown(upload_url, markdown_bytes)
        callback_payload["success"] = True
    except Exception as e:
        callback_payload["success"] = False
        callback_payload["error"] = str(e)[:1000]
    finally:
        try:
            await _post_callback(body.callback_url, callback_payload, shared_secret)
        except Exception:
            # Best-effort callback; if this fails, pg_cron TTL will mark conversion_failed.
            pass

    return {"ok": True}
