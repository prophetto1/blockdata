from __future__ import annotations

import logging

logging.getLogger(__name__).warning(
    "DEPRECATED: conversion-service has been merged into services/platform-api/. "
    "See docs/platform-api/2026-03-10-platform-api-merge.md Task 13. "
    "This service will be decommissioned after the dual-run period."
)

import json
import os
from typing import Any, Optional

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from eyecite import get_citations, resolve_citations


class CitationsRequest(BaseModel):
    text: str


class CitationResult(BaseModel):
    type: str
    matched_text: str
    span: list[int]
    groups: dict[str, Any]
    metadata: dict[str, Any]
    resource_id: Optional[str] = None


class OutputTarget(BaseModel):
    bucket: str
    key: str
    signed_upload_url: str
    token: Optional[str] = None


class ConvertRequest(BaseModel):
    source_uid: str
    conversion_job_id: str
    track: Optional[str] = Field(default=None, pattern=r"^(docling)$")
    source_type: str = Field(pattern=r"^(docx|pdf|pptx|xlsx|html|csv|txt|md|markdown|rst|latex|odt|epub|rtf|org)$")
    source_download_url: str
    output: OutputTarget
    docling_output: Optional[OutputTarget] = None
    html_output: Optional[OutputTarget] = None
    doctags_output: Optional[OutputTarget] = None
    callback_url: str


app = FastAPI()

SOURCE_SUFFIX_BY_TYPE: dict[str, str] = {
    "docx": ".docx", "pdf": ".pdf", "pptx": ".pptx", "xlsx": ".xlsx",
    "html": ".html", "csv": ".csv", "txt": ".txt", "md": ".md", "markdown": ".md",
    "rst": ".rst", "latex": ".tex", "odt": ".odt", "epub": ".epub", "rtf": ".rtf", "org": ".org",
}


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Auth gate must run before request body validation so that missing/wrong
    # secrets get a 401 even if the JSON body is malformed or incomplete.
    if request.url.path in ("/convert", "/citations") and request.method.upper() == "POST":
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


def _build_docling_converter():
    try:
        from docling.document_converter import DocumentConverter, PdfFormatOption
    except Exception as e:  # pragma: no cover
        raise RuntimeError(f"Docling import failed: {e!r}") from e

    artifacts_path = (os.environ.get("DOCLING_ARTIFACTS_PATH") or "").strip()
    if not artifacts_path:
        return DocumentConverter()

    if not os.path.isdir(artifacts_path):
        raise RuntimeError(f"DOCLING_ARTIFACTS_PATH does not exist: {artifacts_path}")

    try:
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions
    except Exception:
        return DocumentConverter()

    try:
        pipeline_options = PdfPipelineOptions(artifacts_path=artifacts_path)
    except TypeError:
        pipeline_options = PdfPipelineOptions()
        if hasattr(pipeline_options, "artifacts_path"):
            setattr(pipeline_options, "artifacts_path", artifacts_path)
        else:
            return DocumentConverter()

    return DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options),
        },
    )


def _canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def _build_docling_json_bytes(doc: Any) -> Optional[bytes]:
    export_to_dict = getattr(doc, "export_to_dict", None)
    if not callable(export_to_dict):
        return None
    return _canonical_json_bytes(export_to_dict())


def _build_docling_html_bytes(doc: Any) -> Optional[bytes]:
    export_to_html = getattr(doc, "export_to_html", None)
    if not callable(export_to_html):
        return None
    html = export_to_html()
    if not isinstance(html, str):
        return None
    return html.encode("utf-8")


def _build_docling_doctags_bytes(doc: Any) -> Optional[bytes]:
    export_to_doctags = getattr(doc, "export_to_doctags", None)
    if callable(export_to_doctags):
        doctags = export_to_doctags()
        if isinstance(doctags, str):
            return doctags.encode("utf-8")
    export_to_document_tokens = getattr(doc, "export_to_document_tokens", None)
    if callable(export_to_document_tokens):
        tokens = export_to_document_tokens()
        if isinstance(tokens, str):
            return tokens.encode("utf-8")
    return None


async def _convert(
    req: ConvertRequest,
) -> tuple[bytes, Optional[bytes], Optional[bytes], Optional[bytes]]:
    """Docling-only conversion. Returns (markdown, docling_json, html, doctags)."""
    converter = _build_docling_converter()
    result = converter.convert(req.source_download_url)
    doc = result.document
    markdown_bytes = doc.export_to_markdown().encode("utf-8")

    docling_json_bytes: Optional[bytes] = None
    if req.docling_output is not None:
        docling_json_bytes = _build_docling_json_bytes(doc)
    html_bytes: Optional[bytes] = None
    if req.html_output is not None:
        html_bytes = _build_docling_html_bytes(doc)
    doctags_bytes: Optional[bytes] = None
    if req.doctags_output is not None:
        doctags_bytes = _build_docling_doctags_bytes(doc)
    return markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes


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
        "track": "docling",
        "md_key": body.output.key,
        "docling_key": None,
        "html_key": None,
        "doctags_key": None,
        "success": False,
        "error": None,
    }

    try:
        markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes = await _convert(body)

        md_upload_url = _append_token_if_needed(body.output.signed_upload_url, body.output.token)
        await _upload_bytes(
            md_upload_url,
            markdown_bytes,
            content_type="text/markdown; charset=utf-8",
        )

        if body.docling_output is not None and docling_json_bytes is not None:
            docling_upload_url = _append_token_if_needed(
                body.docling_output.signed_upload_url,
                body.docling_output.token,
            )
            await _upload_bytes(
                docling_upload_url,
                docling_json_bytes,
                content_type="application/json; charset=utf-8",
            )
            callback_payload["docling_key"] = body.docling_output.key

        if body.html_output is not None and html_bytes is not None:
            html_upload_url = _append_token_if_needed(
                body.html_output.signed_upload_url,
                body.html_output.token,
            )
            await _upload_bytes(
                html_upload_url,
                html_bytes,
                content_type="text/html",
            )
            callback_payload["html_key"] = body.html_output.key

        if body.doctags_output is not None and doctags_bytes is not None:
            doctags_upload_url = _append_token_if_needed(
                body.doctags_output.signed_upload_url,
                body.doctags_output.token,
            )
            await _upload_bytes(
                doctags_upload_url,
                doctags_bytes,
                content_type="text/plain; charset=utf-8",
            )
            callback_payload["doctags_key"] = body.doctags_output.key

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


def _serialize_citation(c: Any) -> dict[str, Any]:
    meta = c.metadata
    meta_dict: dict[str, Any] = {}
    for field in meta.__dataclass_fields__:
        val = getattr(meta, field, None)
        if val is not None:
            meta_dict[field] = val
    return {
        "type": type(c).__name__,
        "matched_text": c.matched_text(),
        "span": list(c.span()),
        "groups": dict(c.groups),
        "metadata": meta_dict,
    }


@app.post("/citations")
async def extract_citations(
    body: CitationsRequest,
    x_conversion_service_key: Optional[str] = Header(default=None),
):
    _require_shared_secret(x_conversion_service_key)

    cites = get_citations(body.text, remove_ambiguous=False)
    resolutions = resolve_citations(cites)

    results = []
    cite_to_resource: dict[int, int] = {}
    resources = []
    for i, (resource, members) in enumerate(resolutions.items()):
        resources.append({
            "id": i,
            "anchor": _serialize_citation(resource.citation),
            "count": len(members),
        })
        for m in members:
            cite_to_resource[id(m)] = i

    for c in cites:
        entry = _serialize_citation(c)
        entry["resource_id"] = cite_to_resource.get(id(c))
        results.append(entry)

    return {
        "citations": results,
        "resources": resources,
        "total": len(results),
    }
