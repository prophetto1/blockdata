"""Document conversion logic — Docling-only."""

import json
import logging
import os
from typing import Any, Optional

from app.domain.conversion.models import ConvertRequest
from app.infra.http_client import download_bytes

_log = logging.getLogger(__name__)

SOURCE_SUFFIX_BY_TYPE: dict[str, str] = {
    "docx": ".docx", "pdf": ".pdf", "pptx": ".pptx", "xlsx": ".xlsx",
    "html": ".html", "csv": ".csv", "txt": ".txt", "md": ".md", "markdown": ".md",
    "rst": ".rst", "latex": ".tex", "odt": ".odt", "epub": ".epub", "rtf": ".rtf", "org": ".org",
}


def _canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _resolve_artifacts_path() -> Optional[str]:
    path = (os.environ.get("DOCLING_ARTIFACTS_PATH") or "").strip()
    if path and os.path.isdir(path):
        return path
    return None


def _build_ocr_options(ocr_cfg: dict[str, Any]) -> Any:
    """Map our profile ocr_options config to a docling OcrOptions subclass."""
    from docling.datamodel.pipeline_options import (
        EasyOcrOptions,
        OcrAutoOptions,
        RapidOcrOptions,
        TesseractCliOcrOptions,
        TesseractOcrOptions,
        OcrMacOptions,
    )

    kind = ocr_cfg.get("kind", "auto")
    lang = ocr_cfg.get("lang", [])

    OCR_MAP: dict[str, type] = {
        "easyocr": EasyOcrOptions,
        "tesseract": TesseractCliOcrOptions,
        "tesserocr": TesseractOcrOptions,
        "rapidocr": RapidOcrOptions,
        "ocrmac": OcrMacOptions,
        "auto": OcrAutoOptions,
    }
    cls = OCR_MAP.get(kind, OcrAutoOptions)
    kwargs: dict[str, Any] = {}
    if lang:
        kwargs["lang"] = lang
    force = ocr_cfg.get("force_full_page_ocr")
    if force is not None:
        kwargs["force_full_page_ocr"] = force
    return cls(**kwargs)


def _build_table_structure_options(table_cfg: dict[str, Any]) -> Any:
    """Map our profile table_structure_options to docling TableStructureOptions."""
    from docling.datamodel.pipeline_options import TableFormerMode, TableStructureOptions

    mode_str = table_cfg.get("mode", "fast")
    mode = TableFormerMode.ACCURATE if mode_str == "accurate" else TableFormerMode.FAST
    return TableStructureOptions(
        do_cell_matching=table_cfg.get("do_cell_matching", True),
        mode=mode,
    )


def _build_standard_converter(config: dict[str, Any]) -> Any:
    """Build a DocumentConverter for the standard (PDF) pipeline from profile config."""
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import DocumentConverter, PdfFormatOption

    pdf_cfg = config.get("pdf_pipeline", {})
    enrichments = config.get("enrichments", {})
    artifacts_path = _resolve_artifacts_path()

    # Collect PdfPipelineOptions kwargs
    kwargs: dict[str, Any] = {}
    if artifacts_path:
        kwargs["artifacts_path"] = artifacts_path

    # Direct boolean/scalar fields from pdf_pipeline
    for key in (
        "do_ocr", "do_table_structure", "do_code_enrichment",
        "do_formula_enrichment", "force_backend_text",
    ):
        val = pdf_cfg.get(key)
        if val is not None:
            kwargs[key] = val

    # Paginated options from pdf_pipeline
    for key in ("images_scale", "generate_page_images", "generate_picture_images"):
        val = pdf_cfg.get(key)
        if val is not None:
            kwargs[key] = val

    # Enrichments (live at ConvertPipelineOptions level, parent of PdfPipelineOptions)
    for key in ("do_picture_classification", "do_picture_description", "do_chart_extraction"):
        val = enrichments.get(key)
        if val is not None:
            kwargs[key] = val

    # OCR options
    ocr_cfg = pdf_cfg.get("ocr_options")
    if ocr_cfg and isinstance(ocr_cfg, dict):
        try:
            kwargs["ocr_options"] = _build_ocr_options(ocr_cfg)
        except Exception as e:
            _log.warning("Failed to build OCR options from config, using defaults: %s", e)

    # Table structure options
    table_cfg = pdf_cfg.get("table_structure_options")
    if table_cfg and isinstance(table_cfg, dict):
        try:
            kwargs["table_structure_options"] = _build_table_structure_options(table_cfg)
        except Exception as e:
            _log.warning("Failed to build table structure options from config, using defaults: %s", e)

    # Document timeout from top-level config
    timeout = config.get("document_timeout")
    if timeout is not None:
        kwargs["document_timeout"] = timeout

    # Accelerator options
    accel_cfg = config.get("accelerator_options")
    if accel_cfg and isinstance(accel_cfg, dict):
        try:
            from docling.datamodel.accelerator_options import AcceleratorOptions
            accel_kwargs: dict[str, Any] = {}
            if "num_threads" in accel_cfg:
                accel_kwargs["num_threads"] = accel_cfg["num_threads"]
            if "device" in accel_cfg:
                from docling.datamodel.accelerator_options import AcceleratorDevice
                device_map = {
                    "auto": AcceleratorDevice.AUTO,
                    "cpu": AcceleratorDevice.CPU,
                    "cuda": AcceleratorDevice.CUDA,
                    "mps": AcceleratorDevice.MPS,
                    "xpu": AcceleratorDevice.XPU,
                }
                device = device_map.get(accel_cfg["device"])
                if device is not None:
                    accel_kwargs["device"] = device
            if accel_kwargs:
                kwargs["accelerator_options"] = AcceleratorOptions(**accel_kwargs)
        except Exception as e:
            _log.warning("Failed to build accelerator options from config: %s", e)

    pipeline_options = PdfPipelineOptions(**kwargs)
    _log.info(
        "Built standard pipeline: do_ocr=%s, ocr=%s, table_mode=%s, enrichments=%s",
        kwargs.get("do_ocr", True),
        type(pipeline_options.ocr_options).__name__,
        getattr(pipeline_options.table_structure_options, "mode", "?"),
        {k: kwargs.get(k) for k in ("do_picture_classification", "do_picture_description", "do_chart_extraction") if k in kwargs},
    )
    return DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)},
    )


def _build_vlm_converter(config: dict[str, Any]) -> Any:
    """Build a DocumentConverter for the VLM pipeline from profile config."""
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import VlmPipelineOptions
    from docling.document_converter import DocumentConverter, PdfFormatOption

    vlm_cfg = config.get("vlm_pipeline", {})
    enrichments = config.get("enrichments", {})
    artifacts_path = _resolve_artifacts_path()

    kwargs: dict[str, Any] = {}
    if artifacts_path:
        kwargs["artifacts_path"] = artifacts_path

    # VLM-specific options
    if vlm_cfg.get("generate_page_images") is not None:
        kwargs["generate_page_images"] = vlm_cfg["generate_page_images"]
    if vlm_cfg.get("force_backend_text") is not None:
        kwargs["force_backend_text"] = vlm_cfg["force_backend_text"]

    # VLM model options via preset
    vlm_opts_cfg = vlm_cfg.get("vlm_options", {})
    preset = vlm_opts_cfg.get("preset")
    if preset:
        try:
            from docling.datamodel.pipeline_options import VlmConvertOptions
            kwargs["vlm_options"] = VlmConvertOptions.from_preset(preset)
            _log.info("VLM pipeline using preset: %s", preset)
        except Exception as e:
            _log.warning("Failed to load VLM preset '%s', using default: %s", preset, e)

    # Enrichments
    for key in ("do_picture_classification", "do_picture_description", "do_chart_extraction"):
        val = enrichments.get(key)
        if val is not None:
            kwargs[key] = val

    # Document timeout
    timeout = config.get("document_timeout")
    if timeout is not None:
        kwargs["document_timeout"] = timeout

    pipeline_options = VlmPipelineOptions(**kwargs)
    _log.info("Built VLM pipeline: preset=%s", preset or "default")

    # VLM pipeline uses VlmPipeline class
    try:
        from docling.pipeline.vlm_pipeline import VlmPipeline
        return DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(
                    pipeline_cls=VlmPipeline,
                    pipeline_options=pipeline_options,
                ),
            },
        )
    except ImportError:
        _log.warning("VlmPipeline not available, falling back to standard pipeline")
        return DocumentConverter()


def _build_docling_converter(config: Optional[dict[str, Any]] = None) -> Any:
    """Build a DocumentConverter, optionally using a pipeline_config from parsing profiles."""
    if config:
        # Strip internal metadata keys
        config = {k: v for k, v in config.items() if not k.startswith("_")}
        pipeline = config.get("pipeline", "standard")

        if pipeline == "vlm":
            return _build_vlm_converter(config)
        else:
            return _build_standard_converter(config)

    # No config — bare defaults
    try:
        from docling.document_converter import DocumentConverter, PdfFormatOption
    except Exception as e:
        raise RuntimeError(f"Docling import failed: {e!r}") from e

    artifacts_path = _resolve_artifacts_path()
    if not artifacts_path:
        return DocumentConverter()

    try:
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        pipeline_options = PdfPipelineOptions(artifacts_path=artifacts_path)
        return DocumentConverter(
            format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)},
        )
    except Exception:
        return DocumentConverter()


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


def _extract_page_nos(prov_entries: Any) -> list[int]:
    pages: set[int] = set()
    for entry in prov_entries or []:
        raw = getattr(entry, "page_no", None)
        if isinstance(raw, int) and raw > 0:
            pages.add(raw)
    return sorted(pages)


def _normalize_label(raw_label: Any) -> str:
    if hasattr(raw_label, "value"):
        raw_label = raw_label.value
    if isinstance(raw_label, str) and raw_label:
        return raw_label
    return "other"


def _map_docling_label(label: str) -> str:
    label_lc = label.lower()
    if label_lc in {"title", "section_header"}:
        return "heading"
    if label_lc in {"paragraph", "text"}:
        return "paragraph"
    if label_lc == "list_item":
        return "list_item"
    if label_lc == "code":
        return "code_block"
    if label_lc in {"table", "document_index"}:
        return "table"
    if label_lc == "picture":
        return "figure"
    if label_lc == "caption":
        return "caption"
    if label_lc == "footnote":
        return "footnote"
    if label_lc == "formula":
        return "other"
    if label_lc == "page_header":
        return "page_header"
    if label_lc == "page_footer":
        return "page_footer"
    if label_lc in {"checkbox_selected", "checkbox_unselected"}:
        return "checkbox"
    if label_lc == "form":
        return "form_region"
    if label_lc == "key_value_region":
        return "key_value_region"
    return "other"


def _extract_item_content(doc: Any, item: Any) -> str:
    text = getattr(item, "text", None)
    if isinstance(text, str) and text:
        return text

    orig = getattr(item, "orig", None)
    if isinstance(orig, str) and orig:
        return orig

    export_to_markdown = getattr(item, "export_to_markdown", None)
    if callable(export_to_markdown):
        try:
            markdown = export_to_markdown(doc=doc)
            if isinstance(markdown, str):
                return markdown
        except TypeError:
            markdown = export_to_markdown()
            if isinstance(markdown, str):
                return markdown
        except Exception:
            pass

    caption_text = getattr(item, "caption_text", None)
    if callable(caption_text):
        try:
            caption = caption_text(doc=doc)
            if isinstance(caption, str):
                return caption
        except Exception:
            pass

    return ""


def _get_parent_ref(item: Any) -> Optional[str]:
    """Extract parent $ref string from a docling item."""
    parent = getattr(item, "parent", None)
    if parent is None:
        return None
    # docling RefItem stores $ref as .cref (Pydantic alias)
    ref = getattr(parent, "cref", None)
    if ref:
        return ref
    # Fallback: direct attribute or dict access
    ref = getattr(parent, "$ref", None)
    if ref:
        return ref
    if isinstance(parent, dict):
        return parent.get("$ref")
    return None


def extract_docling_blocks(doc: Any) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    iterate_items = getattr(doc, "iterate_items", None)
    if not callable(iterate_items):
        return blocks

    # Build set of inline group refs — their children should be merged into one block.
    inline_group_refs: set[str] = set()
    for group in getattr(doc, "groups", None) or []:
        label = _normalize_label(getattr(group, "label", None))
        if label == "inline":
            ref = getattr(group, "self_ref", None)
            if ref:
                inline_group_refs.add(ref)

    # Track merged inline group blocks: parent_ref -> index in blocks list
    inline_block_idx: dict[str, int] = {}

    for item, _level in iterate_items(with_groups=False):
        pointer = getattr(item, "self_ref", None)
        if not isinstance(pointer, str) or not pointer:
            continue

        # Check if item belongs to an inline group — merge into one block
        parent_ref = _get_parent_ref(item)
        if parent_ref and parent_ref in inline_group_refs:
            content = _extract_item_content(doc, item)
            page_nos = _extract_page_nos(getattr(item, "prov", None))

            if parent_ref in inline_block_idx:
                existing = blocks[inline_block_idx[parent_ref]]
                existing["block_content"] += content
                for p in page_nos:
                    if p not in existing["page_nos"]:
                        existing["page_nos"].append(p)
                existing["page_nos"].sort()
                existing["page_no"] = existing["page_nos"][0] if existing["page_nos"] else None
            else:
                inline_block_idx[parent_ref] = len(blocks)
                blocks.append({
                    "block_type": "paragraph",
                    "block_content": content,
                    "pointer": parent_ref,
                    "page_no": page_nos[0] if page_nos else None,
                    "page_nos": page_nos,
                    "parser_block_type": "inline",
                    "parser_path": parent_ref,
                })
            continue

        label = _normalize_label(getattr(item, "label", None))
        page_nos = _extract_page_nos(getattr(item, "prov", None))

        blocks.append({
            "block_type": _map_docling_label(label),
            "block_content": _extract_item_content(doc, item),
            "pointer": pointer,
            "page_no": page_nos[0] if page_nos else None,
            "page_nos": page_nos,
            "parser_block_type": label,
            "parser_path": pointer,
        })

    return blocks


async def convert(
    req: ConvertRequest,
) -> tuple[bytes, Optional[bytes], Optional[bytes], Optional[bytes], list[dict[str, Any]]]:
    """Run the Docling conversion pipeline. Returns (markdown, docling_json, html, doctags, blocks)."""
    converter = _build_docling_converter(req.pipeline_config)
    result = converter.convert(req.source_download_url)
    doc = result.document
    markdown_bytes = doc.export_to_markdown().encode("utf-8")
    docling_json_bytes = _build_docling_json_bytes(doc) if req.docling_output is not None else None
    html_bytes = _build_docling_html_bytes(doc) if req.html_output is not None else None
    doctags_bytes = _build_docling_doctags_bytes(doc) if req.doctags_output is not None else None
    blocks = extract_docling_blocks(doc)
    return markdown_bytes, docling_json_bytes, html_bytes, doctags_bytes, blocks
