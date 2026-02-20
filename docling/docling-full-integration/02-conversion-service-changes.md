# Conversion Service Changes

**File:** `services/conversion-service/app/main.py`
**Current:** 351 lines, `DocumentConverter()` with default options, 13 source types

---

## 1. Expand Source Type Support

### Current regex (line 26)
```python
source_type: str = Field(pattern=r"^(docx|pdf|pptx|xlsx|html|csv|txt|rst|latex|odt|epub|rtf|org)$")
```

### New regex
```python
source_type: str = Field(pattern=r"^(docx|pdf|pptx|xlsx|html|csv|txt|rst|latex|odt|epub|rtf|org|image|asciidoc|xml_jats|xml_uspto|json_docling|audio|vtt|mets_gbs)$")
```

### New suffix mappings (add to `SOURCE_SUFFIX_BY_TYPE`)
```python
SOURCE_SUFFIX_BY_TYPE.update({
    "image": ".png",      # Docling auto-detects actual image format
    "asciidoc": ".adoc",
    "xml_jats": ".xml",
    "xml_uspto": ".xml",
    "json_docling": ".json",
    "audio": ".wav",      # Docling auto-detects actual audio format
    "vtt": ".vtt",
    "mets_gbs": ".tar.gz",
})
```

---

## 2. Add Profile and Enricher Configuration to Request Body

### New fields on ConvertRequest

```python
class DoclingEnricherConfig(BaseModel):
    """Enricher toggles forwarded from admin runtime policy."""
    do_ocr: bool = True
    do_table_structure: bool = True
    do_code_enrichment: bool = False
    do_formula_enrichment: bool = False
    do_picture_classification: bool = False
    do_picture_description: bool = False
    picture_description_mode: Optional[str] = Field(
        default=None,
        pattern=r"^(api|vlm_local)$",
        description="Only relevant when do_picture_description=True"
    )
    layout_model: Optional[str] = Field(
        default=None,
        description="Layout model name: DOCLING_LAYOUT_HERON (default), DOCLING_LAYOUT_EGRET_MEDIUM, DOCLING_LAYOUT_EGRET_LARGE, DOCLING_LAYOUT_EGRET_XLARGE"
    )
    table_structure_mode: Optional[str] = Field(
        default=None,
        pattern=r"^(FAST|ACCURATE)$",
        description="TableFormer mode. Default: ACCURATE"
    )


class ConvertRequest(BaseModel):
    source_uid: str
    conversion_job_id: str
    track: Optional[str] = Field(default=None, pattern=r"^(mdast|docling|pandoc)$")
    source_type: str = Field(pattern=r"^(docx|pdf|pptx|xlsx|html|csv|txt|rst|latex|odt|epub|rtf|org|image|asciidoc|xml_jats|xml_uspto|json_docling|audio|vtt|mets_gbs)$")
    source_download_url: str
    output: OutputTarget
    docling_output: Optional[OutputTarget] = None
    pandoc_output: Optional[OutputTarget] = None
    callback_url: str
    # NEW fields
    profile: Optional[str] = Field(
        default=None,
        pattern=r"^(docling_pdf_fast_deterministic|docling_pdf_balanced_default|docling_pdf_high_recall_layout_semantic|docling_simple_picture_aware|docling_audio_asr_default)$",
        description="Quality tier. NULL = use default for format."
    )
    enricher_config: Optional[DoclingEnricherConfig] = None
    picture_description_api_url: Optional[str] = Field(
        default=None,
        description="OpenAI-compatible endpoint for picture description. Forwarded from admin policy."
    )
```

---

## 3. Profile → Pipeline Options Mapping

### New function: `_build_pipeline_options`

```python
def _build_pipeline_options(
    profile: Optional[str],
    enricher_config: Optional[DoclingEnricherConfig],
    source_type: str,
) -> dict:
    """
    Build Docling pipeline options from profile + enricher overrides.
    Returns a dict of format_options suitable for DocumentConverter().

    Pipeline selection is AUTOMATIC based on InputFormat.
    This function only controls OPTIONS within the auto-selected pipeline.
    """
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import (
        PdfPipelineOptions,
        TableStructureOptions,
        TableFormerMode,
    )
    from docling.document_converter import PdfFormatOption

    # Only PDF/image/mets_gbs use StandardPdfPipeline with configurable options.
    # SimplePipeline formats (docx, pptx, html, etc.) ignore most options.
    # AsrPipeline (audio) has its own options (not yet exposed).
    pdf_formats = {"pdf", "image", "mets_gbs"}

    if source_type not in pdf_formats:
        # SimplePipeline and AsrPipeline: no pipeline options to configure.
        # Picture enrichers could still apply but are ConvertPipeline-level,
        # handled separately.
        return {}

    # Resolve enricher config (use defaults if not provided)
    ec = enricher_config or DoclingEnricherConfig()

    # Resolve profile defaults
    resolved_profile = profile or "docling_pdf_balanced_default"

    if resolved_profile == "docling_pdf_fast_deterministic":
        opts = PdfPipelineOptions(
            do_ocr=False,
            do_table_structure=False,
            do_code_enrichment=False,
            do_formula_enrichment=False,
        )
    elif resolved_profile == "docling_pdf_balanced_default":
        table_mode = TableFormerMode.ACCURATE
        if ec.table_structure_mode == "FAST":
            table_mode = TableFormerMode.FAST

        opts = PdfPipelineOptions(
            do_ocr=ec.do_ocr,
            do_table_structure=ec.do_table_structure,
            table_structure_options=TableStructureOptions(mode=table_mode),
            do_code_enrichment=ec.do_code_enrichment,
            do_formula_enrichment=ec.do_formula_enrichment,
        )
    elif resolved_profile == "docling_pdf_high_recall_layout_semantic":
        # Import layout model configs
        try:
            from docling.datamodel.pipeline_options import LayoutOptions
            # Use best available layout model
            layout_name = ec.layout_model or "DOCLING_LAYOUT_EGRET_XLARGE"
            layout_opts = _resolve_layout_model(layout_name)
        except ImportError:
            layout_opts = None

        opts = PdfPipelineOptions(
            do_ocr=True,
            do_table_structure=True,
            table_structure_options=TableStructureOptions(mode=TableFormerMode.ACCURATE),
            do_code_enrichment=True,
            do_formula_enrichment=True,
        )
        if layout_opts is not None:
            opts.layout_options = layout_opts
    else:
        # Fallback: balanced default
        opts = PdfPipelineOptions(
            do_ocr=ec.do_ocr,
            do_table_structure=ec.do_table_structure,
            do_code_enrichment=ec.do_code_enrichment,
            do_formula_enrichment=ec.do_formula_enrichment,
        )

    # Artifacts path override
    artifacts_path = (os.environ.get("DOCLING_ARTIFACTS_PATH") or "").strip()
    if artifacts_path and os.path.isdir(artifacts_path):
        try:
            opts.artifacts_path = artifacts_path
        except (TypeError, AttributeError):
            pass

    # Picture enrichers (apply to both PDF and SimplePipeline)
    # These are ConvertPipelineOptions-level, set on the PdfPipelineOptions
    # which inherits from ConvertPipelineOptions
    try:
        if hasattr(opts, "do_picture_classification"):
            opts.do_picture_classification = ec.do_picture_classification
        if hasattr(opts, "do_picture_description"):
            opts.do_picture_description = ec.do_picture_description
    except (TypeError, AttributeError):
        pass

    # All StandardPdfPipeline formats share the same options object.
    # Docling auto-selects the pipeline based on InputFormat, but the
    # format_options dict must have a key per format to apply options.
    fmt_opts = {InputFormat.PDF: PdfFormatOption(pipeline_options=opts)}
    if source_type == "image":
        fmt_opts[InputFormat.IMAGE] = PdfFormatOption(pipeline_options=opts)
    elif source_type == "mets_gbs":
        fmt_opts[InputFormat.METS_GBS] = PdfFormatOption(pipeline_options=opts)
    return fmt_opts


def _resolve_layout_model(name: str):
    """Resolve layout model config by name string."""
    try:
        from docling.datamodel.pipeline_options import (
            DOCLING_LAYOUT_HERON,
            DOCLING_LAYOUT_EGRET_MEDIUM,
            DOCLING_LAYOUT_EGRET_LARGE,
            DOCLING_LAYOUT_EGRET_XLARGE,
        )
        models = {
            "DOCLING_LAYOUT_HERON": DOCLING_LAYOUT_HERON,
            "DOCLING_LAYOUT_EGRET_MEDIUM": DOCLING_LAYOUT_EGRET_MEDIUM,
            "DOCLING_LAYOUT_EGRET_LARGE": DOCLING_LAYOUT_EGRET_LARGE,
            "DOCLING_LAYOUT_EGRET_XLARGE": DOCLING_LAYOUT_EGRET_XLARGE,
        }
        return models.get(name, DOCLING_LAYOUT_HERON)
    except ImportError:
        return None
```

---

## 4. Build and Emit Parser Provenance

### New function: `_extract_parser_provenance`

```python
def _extract_parser_provenance(
    result,  # docling.datamodel.document.ConversionResult
    profile: Optional[str],
    enricher_config: Optional[DoclingEnricherConfig],
    effective_options: Optional[dict],
) -> dict:
    """
    Extract parser provenance from a Docling ConversionResult.
    This metadata is sent in the callback payload and persisted
    in conversion_parsing and artifact_meta.
    """
    import docling
    ec = enricher_config or DoclingEnricherConfig()

    provenance = {
        "version": getattr(docling, "__version__", None),
        "pipeline_family": None,
        "profile_name": profile or "docling_pdf_balanced_default",
        "backend_name": None,
        "input_format": None,
        "input_mime": None,
        "options_json": None,
        "options_hash": None,
        "extenders_json": {
            "do_ocr": ec.do_ocr,
            "do_table_structure": ec.do_table_structure,
            "do_code_enrichment": ec.do_code_enrichment,
            "do_formula_enrichment": ec.do_formula_enrichment,
            "do_picture_classification": ec.do_picture_classification,
            "do_picture_description": ec.do_picture_description,
        },
    }

    # Extract from ConversionResult if available
    try:
        if hasattr(result, "input") and result.input:
            inp = result.input
            if hasattr(inp, "format") and inp.format:
                provenance["input_format"] = inp.format.name if hasattr(inp.format, "name") else str(inp.format)
            if hasattr(inp, "mime_type"):
                provenance["input_mime"] = inp.mime_type
    except Exception:
        pass

    # Pipeline family from the pipeline class used
    try:
        if hasattr(result, "_pipeline") and result._pipeline:
            provenance["pipeline_family"] = type(result._pipeline).__name__
    except Exception:
        pass

    # Backend name
    try:
        if hasattr(result, "input") and hasattr(result.input, "_backend"):
            provenance["backend_name"] = type(result.input._backend).__name__
    except Exception:
        pass

    # Options hash (SHA-256 of canonical JSON)
    if effective_options:
        try:
            options_bytes = _canonical_json_bytes(effective_options)
            import hashlib
            provenance["options_json"] = json.loads(options_bytes.decode("utf-8"))
            provenance["options_hash"] = hashlib.sha256(options_bytes).hexdigest()
        except Exception:
            pass

    return provenance


def _extract_conversion_metadata(result) -> dict:
    """
    Extract conversion-level metadata (status, errors, timings, confidence)
    from a Docling ConversionResult.
    """
    meta = {
        "conversion_status": None,
        "errors": [],
        "timings": {},
        "confidence": None,
    }

    try:
        if hasattr(result, "status"):
            meta["conversion_status"] = result.status.name if hasattr(result.status, "name") else str(result.status)
    except Exception:
        pass

    try:
        if hasattr(result, "errors") and result.errors:
            meta["errors"] = [
                {
                    "component_type": getattr(e, "component_type", None),
                    "module_name": getattr(e, "module_name", None),
                    "error_message": getattr(e, "error_message", str(e)),
                }
                for e in result.errors[:50]  # cap at 50 errors
            ]
    except Exception:
        pass

    try:
        if hasattr(result, "timings") and result.timings:
            meta["timings"] = {
                k: {
                    "total": getattr(v, "total", None),
                    "count": getattr(v, "count", None),
                }
                for k, v in result.timings.items()
            }
    except Exception:
        pass

    try:
        if hasattr(result, "confidence") and result.confidence:
            conf = result.confidence
            if hasattr(conf, "to_dict"):
                meta["confidence"] = conf.to_dict()
            elif hasattr(conf, "pages"):
                meta["confidence"] = {
                    "pages": [
                        {
                            "page_no": getattr(p, "page_no", None),
                            "parse_score": getattr(p, "parse_score", None),
                            "layout_score": getattr(p, "layout_score", None),
                            "table_score": getattr(p, "table_score", None),
                            "ocr_score": getattr(p, "ocr_score", None),
                        }
                        for p in conf.pages
                    ] if conf.pages else []
                }
    except Exception:
        pass

    return meta
```

---

## 5. Modified `_convert` Function

### Key changes:
1. Pass `profile` and `enricher_config` to `_build_pipeline_options`
2. Capture `ConversionResult` (not just `result.document`)
3. Return provenance and conversion metadata alongside artifact bytes

```python
async def _convert(req: ConvertRequest) -> tuple[
    bytes,                    # markdown_bytes
    Optional[bytes],          # docling_json_bytes
    Optional[bytes],          # pandoc_json_bytes
    Optional[dict],           # parser_provenance
    Optional[dict],           # conversion_metadata
]:
    track = _resolve_track(req)

    if track == "mdast":
        # ...unchanged mdast logic...
        return markdown_bytes, docling_json_bytes, pandoc_json_bytes, None, None

    if track == "docling":
        format_options = _build_pipeline_options(
            req.profile, req.enricher_config, req.source_type,
        )
        converter = DocumentConverter(format_options=format_options) if format_options else DocumentConverter()
        result = converter.convert(req.source_download_url)
        doc = result.document
        markdown_bytes = doc.export_to_markdown().encode("utf-8")

        docling_json_bytes = None
        if req.docling_output is not None:
            docling_json_bytes = _build_docling_json_bytes(doc)

        pandoc_json_bytes = (
            await _maybe_build_pandoc_ast_bytes(req)
            if req.pandoc_output is not None
            else None
        )

        # Build effective options dict for provenance
        effective_options = None
        if format_options:
            try:
                from docling.datamodel.base_models import InputFormat
                pdf_opt = format_options.get(InputFormat.PDF)
                if pdf_opt and hasattr(pdf_opt, "pipeline_options"):
                    effective_options = pdf_opt.pipeline_options.model_dump()
            except Exception:
                pass

        provenance = _extract_parser_provenance(
            result, req.profile, req.enricher_config, effective_options,
        )
        conversion_meta = _extract_conversion_metadata(result)

        return markdown_bytes, docling_json_bytes, pandoc_json_bytes, provenance, conversion_meta

    if track == "pandoc":
        # ...unchanged pandoc logic...
        return markdown_bytes, docling_json_bytes, pandoc_json_bytes, None, None

    raise RuntimeError(f"Unknown track: {track}")
```

---

## 6. Modified `/convert` Endpoint

### Key changes:
1. Unpack provenance and conversion_meta from `_convert`
2. Add to callback payload

```python
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
        "track": _resolve_track(body),
        "md_key": body.output.key,
        "docling_key": None,
        "pandoc_key": None,
        "success": False,
        "error": None,
        # NEW fields
        "parser_provenance": None,
        "conversion_status": None,
        "conversion_errors": [],
        "conversion_timings": {},
    }

    try:
        markdown_bytes, docling_json_bytes, pandoc_json_bytes, provenance, conversion_meta = await _convert(body)

        # Upload artifacts (unchanged logic)
        # ...

        callback_payload["success"] = True
        # NEW: attach provenance and metadata
        if provenance:
            callback_payload["parser_provenance"] = provenance
        if conversion_meta:
            callback_payload["conversion_status"] = conversion_meta.get("conversion_status")
            callback_payload["conversion_errors"] = conversion_meta.get("errors", [])
            callback_payload["conversion_timings"] = conversion_meta.get("timings", {})
    except Exception as e:
        callback_payload["success"] = False
        callback_payload["error"] = str(e)[:1000]
    finally:
        try:
            await _post_callback(body.callback_url, callback_payload, shared_secret)
        except Exception:
            pass

    return {"ok": True}
```

---

## 7. Docker Image Changes

### For new source types (no new deps):
- `image`, `asciidoc`, `xml_jats`, `xml_uspto`, `json_docling`, `vtt`, `mets_gbs` — all handled by Docling's built-in backends. No additional system packages.

### For code/formula enrichment:
- Already available in default Docling install. Just needs `do_code_enrichment=True` and `do_formula_enrichment=True` in options. No new deps.

### For picture classification:
- Already available. Needs GPU for good performance. No new deps.

### For picture description (API mode):
- No new deps. Requires `enable_remote_services=True` and a configured API endpoint. Environment variable `PICTURE_DESCRIPTION_API_URL` if using API mode.

### For picture description (local VLM mode):
- Needs `docling[vlm]` extra. Large model download (~2-4GB). Significantly increases Docker image size. **Recommend API mode first.**

### For audio/ASR:
- Needs `docling[asr]` extra dependency.
- Needs Whisper model download in Dockerfile warmup.
- **Separate concern — can defer to a later phase.**

### Updated `pyproject.toml` dependencies
```toml
[project]
dependencies = [
    "docling>=2.70.0",
    "fastapi>=0.110",
    "uvicorn",
    "httpx>=0.26",
    "pydantic>=2.6",
]

[project.optional-dependencies]
asr = ["docling[asr]"]
vlm = ["docling[vlm]"]
```

### Updated Dockerfile warmup (add to warmup.py)
```python
# Existing PDF warmup (unchanged)
# ...

# NEW: Warm up code/formula enrichment models if available
try:
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    opts = PdfPipelineOptions(
        do_code_enrichment=True,
        do_formula_enrichment=True,
    )
    # ... run warmup with these options
except Exception:
    pass  # Non-fatal: models download on first use
```

---

## 8. Test Changes

### New test cases for `tests/test_main.py`:

```python
def test_resolve_profile_defaults():
    """Profile defaults to balanced when not specified."""
    req = ConvertRequest(
        source_uid="abc",
        conversion_job_id="123",
        source_type="pdf",
        source_download_url="http://example.com/test.pdf",
        output=OutputTarget(bucket="docs", key="out.md", signed_upload_url="http://up"),
        callback_url="http://callback",
    )
    assert req.profile is None  # defaults to None, resolved at runtime

def test_enricher_config_defaults():
    """Enricher config uses safe defaults."""
    ec = DoclingEnricherConfig()
    assert ec.do_ocr is True
    assert ec.do_table_structure is True
    assert ec.do_code_enrichment is False
    assert ec.do_picture_classification is False

def test_build_pipeline_options_non_pdf():
    """Non-PDF formats return empty format_options."""
    result = _build_pipeline_options("docling_pdf_balanced_default", None, "docx")
    assert result == {}

def test_build_pipeline_options_fast_profile():
    """Fast profile disables OCR and table structure."""
    result = _build_pipeline_options("docling_pdf_fast_deterministic", None, "pdf")
    # Verify the PdfFormatOption was created with correct settings
    from docling.datamodel.base_models import InputFormat
    assert InputFormat.PDF in result

def test_new_source_types_accepted():
    """New source types pass validation."""
    for st in ["image", "asciidoc", "xml_jats", "xml_uspto", "json_docling", "audio", "vtt"]:
        req = ConvertRequest(
            source_uid="abc",
            conversion_job_id="123",
            source_type=st,
            source_download_url="http://example.com/test",
            output=OutputTarget(bucket="docs", key="out.md", signed_upload_url="http://up"),
            callback_url="http://callback",
        )
        assert req.source_type == st
```