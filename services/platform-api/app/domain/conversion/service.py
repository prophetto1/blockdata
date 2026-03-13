"""Document conversion logic — Docling-only."""

import json
import os
from typing import Any, Optional

from app.domain.conversion.models import ConvertRequest
from app.infra.http_client import download_bytes

SOURCE_SUFFIX_BY_TYPE: dict[str, str] = {
    "docx": ".docx", "pdf": ".pdf", "pptx": ".pptx", "xlsx": ".xlsx",
    "html": ".html", "csv": ".csv", "txt": ".txt", "md": ".md", "markdown": ".md",
    "rst": ".rst", "latex": ".tex", "odt": ".odt", "epub": ".epub", "rtf": ".rtf", "org": ".org",
}


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


async def convert(
    req: ConvertRequest,
) -> tuple[bytes, Optional[bytes], Optional[bytes], Optional[bytes]]:
    """Run the Docling conversion pipeline. Returns (markdown, docling_json, html, doctags)."""
    converter = _build_docling_converter()
    result = converter.convert(req.source_download_url)
    doc = result.document
    markdown_bytes = doc.export_to_markdown().encode("utf-8")
    docling_json_bytes = _build_docling_json_bytes(doc) if req.docling_output is not None else None
    html_bytes = _build_docling_html_bytes(doc) if req.html_output is not None else None
    doctags_bytes = _build_docling_doctags_bytes(doc) if req.doctags_output is not None else None
    return markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes
