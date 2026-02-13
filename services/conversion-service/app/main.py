from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path
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
    track: Optional[str] = Field(default=None, pattern=r"^(mdast|docling|pandoc)$")
    source_type: str = Field(pattern=r"^(docx|pdf|pptx|xlsx|html|csv|txt|rst|latex|odt|epub|rtf|org)$")
    source_download_url: str
    output: OutputTarget
    docling_output: Optional[OutputTarget] = None
    pandoc_output: Optional[OutputTarget] = None
    callback_url: str


app = FastAPI()

SOURCE_SUFFIX_BY_TYPE: dict[str, str] = {
    "docx": ".docx",
    "pdf": ".pdf",
    "pptx": ".pptx",
    "xlsx": ".xlsx",
    "html": ".html",
    "csv": ".csv",
    "txt": ".txt",
    "rst": ".rst",
    "latex": ".tex",
    "odt": ".odt",
    "epub": ".epub",
    "rtf": ".rtf",
    "org": ".org",
}

PANDOC_READER_BY_SOURCE_TYPE: dict[str, str] = {
    "docx": "docx",
    "html": "html",
    "txt": "markdown",
    "rst": "rst",
    "latex": "latex",
    "odt": "odt",
    "epub": "epub",
    "rtf": "rtf",
    "org": "org",
}


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

    # Prefer explicit PDF artifacts path when set. If this version of Docling
    # does not expose the expected pipeline options API, fall back to default.
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


async def _download_bytes(source_download_url: str) -> bytes:
    async with httpx.AsyncClient(timeout=180) as client:
        r = await client.get(source_download_url)
        r.raise_for_status()
        return r.content


def _run_pandoc(input_path: Path, reader: str, writer: str) -> bytes:
    try:
        proc = subprocess.run(
            ["pandoc", "--from", reader, "--to", writer, str(input_path)],
            check=True,
            capture_output=True,
        )
    except FileNotFoundError as e:
        raise RuntimeError("pandoc binary not found in conversion service image") from e
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"").decode("utf-8", errors="replace")
        raise RuntimeError(f"pandoc conversion failed ({reader}->{writer}): {stderr[:1000]}") from e
    return proc.stdout


def _resolve_track(req: ConvertRequest) -> str:
    if req.track:
        return req.track
    # Backward compatibility for older ingest clients.
    if req.source_type == "txt":
        return "mdast"
    return "docling"


async def _convert(req: ConvertRequest) -> tuple[bytes, Optional[bytes], Optional[bytes]]:
    track = _resolve_track(req)

    if track == "mdast":
        if req.source_type != "txt":
            raise RuntimeError(f"mdast track only supports txt in conversion-service path, got: {req.source_type}")
        source_bytes = await _download_bytes(req.source_download_url)
        text = source_bytes.decode("utf-8", errors="replace")
        return text.encode("utf-8"), None, None

    if track == "docling":
        converter = _build_docling_converter()
        result = converter.convert(req.source_download_url)
        doc = result.document
        markdown_bytes = doc.export_to_markdown().encode("utf-8")

        docling_json_bytes: Optional[bytes] = None
        if req.docling_output is not None:
            export_to_dict = getattr(doc, "export_to_dict", None)
            if callable(export_to_dict):
                docling_json_bytes = json.dumps(
                    export_to_dict(),
                    ensure_ascii=False,
                    sort_keys=True,
                    separators=(",", ":"),
                ).encode("utf-8")
        return markdown_bytes, docling_json_bytes, None

    if track == "pandoc":
        reader = PANDOC_READER_BY_SOURCE_TYPE.get(req.source_type)
        if not reader:
            raise RuntimeError(f"pandoc track does not support source_type: {req.source_type}")

        source_bytes = await _download_bytes(req.source_download_url)
        suffix = SOURCE_SUFFIX_BY_TYPE.get(req.source_type, ".bin")
        with tempfile.TemporaryDirectory(prefix="ws-pandoc-") as tmp_dir:
            input_path = Path(tmp_dir) / f"source{suffix}"
            input_path.write_bytes(source_bytes)

            markdown_bytes = _run_pandoc(input_path, reader, "gfm")
            pandoc_json_raw = _run_pandoc(input_path, reader, "json")

        try:
            ast_obj = json.loads(pandoc_json_raw.decode("utf-8"))
        except Exception as e:
            raise RuntimeError(f"pandoc JSON output is invalid: {e!r}") from e
        pandoc_json_bytes = json.dumps(
            ast_obj,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
        return markdown_bytes, None, pandoc_json_bytes

    raise RuntimeError(f"Unknown track: {track}")


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
        "docling_key": None,
        "pandoc_key": None,
        "success": False,
        "error": None,
    }

    try:
        markdown_bytes, docling_json_bytes, pandoc_json_bytes = await _convert(body)

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

        if body.pandoc_output is not None and pandoc_json_bytes is not None:
            pandoc_upload_url = _append_token_if_needed(
                body.pandoc_output.signed_upload_url,
                body.pandoc_output.token,
            )
            await _upload_bytes(
                pandoc_upload_url,
                pandoc_json_bytes,
                content_type="application/json; charset=utf-8",
            )
            callback_payload["pandoc_key"] = body.pandoc_output.key

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
