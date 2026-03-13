"""Document conversion logic — Docling, Pandoc, mdast tracks."""

import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Optional

from app.domain.conversion.models import ConvertRequest
from app.infra.http_client import download_bytes

SOURCE_SUFFIX_BY_TYPE: dict[str, str] = {
    "docx": ".docx", "pdf": ".pdf", "pptx": ".pptx", "xlsx": ".xlsx",
    "html": ".html", "csv": ".csv", "txt": ".txt", "md": ".md", "markdown": ".md",
    "rst": ".rst", "latex": ".tex", "odt": ".odt", "epub": ".epub", "rtf": ".rtf", "org": ".org",
}

PANDOC_READER_BY_SOURCE_TYPE: dict[str, str] = {
    "docx": "docx", "html": "html", "txt": "markdown", "rst": "rst",
    "latex": "latex", "odt": "odt", "epub": "epub", "rtf": "rtf", "org": "org",
}


def resolve_track(req: ConvertRequest) -> str:
    if req.track:
        return req.track
    return "docling"


def _canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _build_docling_converter():
    try:
        from docling.document_converter import DocumentConverter, PdfFormatOption
    except Exception as e:
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
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)},
    )


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
    return html.encode("utf-8") if isinstance(html, str) else None


def _build_docling_doctags_bytes(doc: Any) -> Optional[bytes]:
    for method_name in ("export_to_doctags", "export_to_document_tokens"):
        fn = getattr(doc, method_name, None)
        if callable(fn):
            result = fn()
            if isinstance(result, str):
                return result.encode("utf-8")
    return None


def _run_pandoc(input_path: Path, reader: str, writer: str) -> bytes:
    try:
        proc = subprocess.run(
            ["pandoc", "--from", reader, "--to", writer, str(input_path)],
            check=True, capture_output=True,
        )
    except FileNotFoundError as e:
        raise RuntimeError("pandoc binary not found in conversion service image") from e
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"").decode("utf-8", errors="replace")
        raise RuntimeError(f"pandoc conversion failed ({reader}->{writer}): {stderr[:1000]}") from e
    return proc.stdout


def _build_pandoc_ast_bytes_strict(source_type: str, source_bytes: bytes) -> bytes:
    reader = PANDOC_READER_BY_SOURCE_TYPE.get(source_type)
    if not reader:
        raise RuntimeError(f"pandoc track does not support source_type: {source_type}")
    suffix = SOURCE_SUFFIX_BY_TYPE.get(source_type, ".bin")
    with tempfile.TemporaryDirectory(prefix="ws-pandoc-") as tmp_dir:
        input_path = Path(tmp_dir) / f"source{suffix}"
        input_path.write_bytes(source_bytes)
        pandoc_json_raw = _run_pandoc(input_path, reader, "json")
    try:
        ast_obj = json.loads(pandoc_json_raw.decode("utf-8"))
    except Exception as e:
        raise RuntimeError(f"pandoc JSON output is invalid: {e!r}") from e
    return _canonical_json_bytes(ast_obj)


async def _maybe_build_docling_json_bytes(req: ConvertRequest) -> Optional[bytes]:
    try:
        converter = _build_docling_converter()
        result = converter.convert(req.source_download_url)
        return _build_docling_json_bytes(result.document)
    except Exception:
        return None


async def _maybe_build_pandoc_ast_bytes(req: ConvertRequest, source_bytes: Optional[bytes] = None) -> Optional[bytes]:
    if req.source_type not in PANDOC_READER_BY_SOURCE_TYPE:
        return None
    try:
        if source_bytes is None:
            source_bytes = await download_bytes(req.source_download_url)
        return _build_pandoc_ast_bytes_strict(req.source_type, source_bytes)
    except Exception:
        return None


async def convert(
    req: ConvertRequest,
) -> tuple[bytes, Optional[bytes], Optional[bytes], Optional[bytes], Optional[bytes]]:
    """Run the conversion pipeline. Returns (markdown, docling_json, pandoc_json, html, doctags)."""
    track = resolve_track(req)

    if track == "mdast":
        if req.source_type != "txt":
            raise RuntimeError(f"mdast track only supports txt, got: {req.source_type}")
        source_bytes = await download_bytes(req.source_download_url)
        markdown_bytes = source_bytes.decode("utf-8", errors="replace").encode("utf-8")
        docling_json_bytes = await _maybe_build_docling_json_bytes(req) if req.docling_output is not None else None
        pandoc_json_bytes = await _maybe_build_pandoc_ast_bytes(req, source_bytes) if req.pandoc_output is not None else None
        return markdown_bytes, docling_json_bytes, pandoc_json_bytes, None, None

    if track == "docling":
        converter = _build_docling_converter()
        result = converter.convert(req.source_download_url)
        doc = result.document
        markdown_bytes = doc.export_to_markdown().encode("utf-8")
        docling_json_bytes = _build_docling_json_bytes(doc) if req.docling_output is not None else None
        html_bytes = _build_docling_html_bytes(doc) if req.html_output is not None else None
        doctags_bytes = _build_docling_doctags_bytes(doc) if req.doctags_output is not None else None
        pandoc_json_bytes = await _maybe_build_pandoc_ast_bytes(req) if req.pandoc_output is not None else None
        return markdown_bytes, docling_json_bytes, pandoc_json_bytes, html_bytes, doctags_bytes

    if track == "pandoc":
        reader = PANDOC_READER_BY_SOURCE_TYPE.get(req.source_type)
        if not reader:
            raise RuntimeError(f"pandoc track does not support source_type: {req.source_type}")
        source_bytes = await download_bytes(req.source_download_url)
        suffix = SOURCE_SUFFIX_BY_TYPE.get(req.source_type, ".bin")
        with tempfile.TemporaryDirectory(prefix="ws-pandoc-") as tmp_dir:
            input_path = Path(tmp_dir) / f"source{suffix}"
            input_path.write_bytes(source_bytes)
            markdown_bytes = _run_pandoc(input_path, reader, "gfm")
        pandoc_json_bytes = _build_pandoc_ast_bytes_strict(req.source_type, source_bytes)
        docling_json_bytes = await _maybe_build_docling_json_bytes(req) if req.docling_output is not None else None
        return markdown_bytes, docling_json_bytes, pandoc_json_bytes, None, None

    raise RuntimeError(f"Unknown track: {track}")
