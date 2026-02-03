from __future__ import annotations

import json
import os
from typing import Any, Optional

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
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
    docling_output: Optional[OutputTarget] = None
    callback_url: str


app = FastAPI()

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Auth gate must run before request body validation so that missing/wrong
    # secrets get a 401 even if the JSON body is malformed or incomplete.
    if request.url.path == "/convert" and request.method.upper() == "POST":
        expected = os.environ.get("CONVERSION_SERVICE_KEY")
        if not expected:
            return JSONResponse(status_code=500, content={"detail": "CONVERSION_SERVICE_KEY is not set"})
        provided = request.headers.get("x-conversion-service-key")
        if not provided or provided != expected:
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)


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


async def _upload_bytes(signed_upload_url: str, payload: bytes, content_type: str) -> None:
    # Supabase signed upload URLs sometimes require a token query parameter.
    # If the URL already contains token=, we leave it as-is.
    headers = {
        "Content-Type": content_type,
    }
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.put(signed_upload_url, content=payload, headers=headers)
        if resp.status_code >= 300:
            raise RuntimeError(f"Upload failed: HTTP {resp.status_code} {resp.text[:500]}")


def _append_token_if_needed(url: str, token: Optional[str]) -> str:
    if not token or "token=" in url:
        return url
    join = "&" if "?" in url else "?"
    return f"{url}{join}token={token}"


async def _convert(req: ConvertRequest) -> tuple[bytes, Optional[bytes]]:
    if req.source_type == "txt":
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.get(req.source_download_url)
            r.raise_for_status()
            # Best-effort UTF-8 decode; keep bytes if already utf-8.
            text = r.content.decode("utf-8", errors="replace")
            return text.encode("utf-8"), None

    # docx/pdf via Docling using the signed URL directly.
    try:
        from docling.document_converter import DocumentConverter
    except Exception as e:  # pragma: no cover
        raise RuntimeError(f"Docling import failed: {e!r}") from e

    converter = DocumentConverter()
    result = converter.convert(req.source_download_url)
    doc = result.document
    md = doc.export_to_markdown()

    debug_json_bytes: Optional[bytes] = None
    if req.docling_output is not None:
        export_to_dict = getattr(doc, "export_to_dict", None)
        if callable(export_to_dict):
            debug_json_bytes = json.dumps(
                export_to_dict(),
                ensure_ascii=False,
                indent=2,
            ).encode("utf-8")

    return md.encode("utf-8"), debug_json_bytes


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
        markdown_bytes, debug_json_bytes = await _convert(body)

        md_upload_url = _append_token_if_needed(body.output.signed_upload_url, body.output.token)
        await _upload_bytes(
            md_upload_url,
            markdown_bytes,
            content_type="text/markdown; charset=utf-8",
        )

        if body.docling_output is not None and debug_json_bytes is not None:
            docling_upload_url = _append_token_if_needed(
                body.docling_output.signed_upload_url,
                body.docling_output.token,
            )
            await _upload_bytes(
                docling_upload_url,
                debug_json_bytes,
                content_type="application/json; charset=utf-8",
            )

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
