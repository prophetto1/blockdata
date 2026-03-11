# Pipeline Config Wiring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire parsing profiles from the DB through the ingest edge function to the conversion service, so that selected profiles actually control how docling/pandoc converts documents.

**Architecture:** The `parsing_profiles` table already has seeded profiles. The `conversion_parsing` table already has a `pipeline_config` jsonb column. We need to: (1) pass a `profile_id` through the ingest pipeline, (2) look up the profile in the edge function, (3) send the config to the conversion service, (4) have the conversion service apply it when building converters, (5) save the config used to `conversion_parsing.pipeline_config` on callback.

**Tech Stack:** Deno (edge functions), Python/FastAPI (conversion service), Supabase/PostgreSQL

---

## Task 1: Add `pipeline_config` to ConvertRequest (Python)

**Files:**
- Modify: `services/conversion-service/app/main.py:38-49`

**Step 1: Write the change**

Add `pipeline_config` field to the `ConvertRequest` Pydantic model:

```python
class ConvertRequest(BaseModel):
    source_uid: str
    conversion_job_id: str
    track: Optional[str] = Field(default=None, pattern=r"^(mdast|docling|pandoc)$")
    source_type: str = Field(pattern=r"^(docx|pdf|pptx|xlsx|html|csv|txt|rst|latex|odt|epub|rtf|org)$")
    source_download_url: str
    output: OutputTarget
    docling_output: Optional[OutputTarget] = None
    pandoc_output: Optional[OutputTarget] = None
    html_output: Optional[OutputTarget] = None
    doctags_output: Optional[OutputTarget] = None
    callback_url: str
    pipeline_config: Optional[dict] = None
```

**Step 2: Commit**

```bash
git add services/conversion-service/app/main.py
git commit -m "feat: add pipeline_config field to ConvertRequest model"
```

---

## Task 2: Build docling converter from pipeline_config (Python)

**Files:**
- Modify: `services/conversion-service/app/main.py` (add `_build_docling_converter_from_config`, modify `_convert`)

**Step 1: Add config-aware builder function**

Add after `_build_docling_converter()` (after line 171):

```python
def _build_docling_converter_from_config(config: dict):
    """Build a DocumentConverter using a pipeline_config from the parsing_profiles table."""
    try:
        from docling.document_converter import DocumentConverter, PdfFormatOption
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions
    except Exception as e:
        raise RuntimeError(f"Docling import failed: {e!r}") from e

    artifacts_path = (os.environ.get("DOCLING_ARTIFACTS_PATH") or "").strip() or None

    # Extract pdf_pipeline options from our profile config shape
    pdf_cfg = config.get("pdf_pipeline", {})
    pipeline = config.get("pipeline", "standard")

    if pipeline == "vlm":
        # VLM pipeline — defer to default VLM setup for now
        return _build_docling_converter()

    kwargs: dict[str, Any] = {}
    if artifacts_path and os.path.isdir(artifacts_path):
        kwargs["artifacts_path"] = artifacts_path

    # Map our config keys to PdfPipelineOptions fields
    field_map = {
        "do_ocr": "do_ocr",
        "do_table_structure": "do_table_structure",
        "do_code_enrichment": "do_code_enrichment",
        "do_formula_enrichment": "do_formula_enrichment",
        "force_backend_text": "force_backend_text",
        "generate_page_images": "generate_page_images",
        "generate_picture_images": "generate_picture_images",
        "images_scale": "images_scale",
    }
    for our_key, docling_key in field_map.items():
        val = pdf_cfg.get(our_key)
        if val is None:
            val = config.get("enrichments", {}).get(our_key)
        if val is not None:
            kwargs[docling_key] = val

    # Enrichments at top level
    enrichments = config.get("enrichments", {})
    for key in ("do_picture_classification", "do_picture_description", "do_chart_extraction"):
        val = enrichments.get(key)
        if val is not None:
            kwargs[key] = val

    # OCR options
    ocr_cfg = pdf_cfg.get("ocr_options")
    if ocr_cfg:
        try:
            from docling.datamodel.pipeline_options import (
                EasyOcrOptions,
                TesseractOcrOptions,
                TesseractCliOcrOptions,
                RapidOcrOptions,
            )
            kind = ocr_cfg.get("kind", "auto")
            lang = ocr_cfg.get("lang", [])
            if kind == "easyocr":
                kwargs["ocr_options"] = EasyOcrOptions(lang=lang)
            elif kind == "tesseract":
                kwargs["ocr_options"] = TesseractCliOcrOptions(lang=lang)
            elif kind == "tesserocr":
                kwargs["ocr_options"] = TesseractOcrOptions(lang=lang)
            elif kind == "rapidocr":
                kwargs["ocr_options"] = RapidOcrOptions(lang=lang)
            # else: leave default (auto)
        except ImportError:
            pass

    # Table structure options
    table_cfg = pdf_cfg.get("table_structure_options")
    if table_cfg:
        try:
            from docling.datamodel.pipeline_options import TableStructureOptions, TableFormerMode
            mode_str = table_cfg.get("mode", "fast")
            mode = TableFormerMode.ACCURATE if mode_str == "accurate" else TableFormerMode.FAST
            kwargs["table_structure_options"] = TableStructureOptions(
                do_cell_matching=table_cfg.get("do_cell_matching", True),
                mode=mode,
            )
        except ImportError:
            pass

    try:
        pipeline_options = PdfPipelineOptions(**kwargs)
    except TypeError:
        # Fall back if kwargs have unsupported fields in this docling version
        pipeline_options = PdfPipelineOptions()
        if artifacts_path and os.path.isdir(artifacts_path):
            try:
                pipeline_options.artifacts_path = artifacts_path
            except Exception:
                pass

    return DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options),
        },
    )
```

**Step 2: Update `_convert` to use pipeline_config**

In the docling track branch (line 298-314), change:

```python
    if track == "docling":
        if req.pipeline_config:
            converter = _build_docling_converter_from_config(req.pipeline_config)
        else:
            converter = _build_docling_converter()
        result = converter.convert(req.source_download_url)
```

**Step 3: Update pandoc track to use pipeline_config**

In the pandoc track branch (line 316-330), change `_run_pandoc` calls to use config:

```python
    if track == "pandoc":
        source_bytes = await _download_bytes(req.source_download_url)
        suffix = SOURCE_SUFFIX_BY_TYPE.get(req.source_type, ".bin")

        pandoc_config = req.pipeline_config or {}
        reader = pandoc_config.get("from") or PANDOC_READER_BY_SOURCE_TYPE.get(req.source_type)
        if not reader:
            raise RuntimeError(f"pandoc track does not support source_type: {req.source_type}")

        with tempfile.TemporaryDirectory(prefix="ws-pandoc-") as tmp_dir:
            input_path = Path(tmp_dir) / f"source{suffix}"
            input_path.write_bytes(source_bytes)

            # Build args from config if available
            if pandoc_config:
                pandoc_args = _build_pandoc_args(pandoc_config, str(input_path))
                markdown_args = _build_pandoc_args({**pandoc_config, "to": "gfm"}, str(input_path))
            else:
                pandoc_args = ["--from", reader, "--to", "json", str(input_path)]
                markdown_args = ["--from", reader, "--to", "gfm", str(input_path)]

            markdown_bytes = _run_pandoc_args(pandoc_args if pandoc_config and pandoc_config.get("to") == "gfm" else markdown_args)

        pandoc_json_bytes = _build_pandoc_ast_bytes_strict(req.source_type, source_bytes)
```

Actually — this is getting complicated. Simpler approach: add `_build_pandoc_args` as a minimal helper, and use it only when pipeline_config is present. Otherwise fall back to existing behavior.

**Step 3 (revised): Add `_build_pandoc_args` helper and update pandoc track**

Add a Python port of the `buildPandocArgs` function from the plan doc (section 4). Only the fields we actually use in seed profiles matter: `from`, `to`, `extensions`, `reader.tab_stop`, `reader.track_changes`, `writer.wrap`, `sandbox`.

```python
def _build_pandoc_args(config: dict, input_path: str) -> list[str]:
    """Translate pipeline_config jsonb → pandoc CLI arguments."""
    args = ["pandoc"]

    from_fmt = config.get("from") or "markdown"
    to_fmt = config.get("to") or "json"

    # Apply extensions to from format
    extensions = config.get("extensions", {})
    ext_str = ""
    for name, enabled in extensions.items():
        if enabled is True:
            ext_str += f"+{name}"
        elif enabled is False:
            ext_str += f"-{name}"
    from_fmt += ext_str

    args.extend(["--from", from_fmt, "--to", to_fmt])

    # Reader options
    reader = config.get("reader", {})
    if reader.get("tab_stop"):
        args.extend(["--tab-stop", str(reader["tab_stop"])])
    if reader.get("track_changes") and reader["track_changes"] != "accept":
        args.extend(["--track-changes", str(reader["track_changes"])])
    if reader.get("standalone"):
        args.append("--standalone")

    # Writer options
    writer = config.get("writer", {})
    if writer.get("wrap"):
        args.extend(["--wrap", str(writer["wrap"])])

    # Sandbox
    if config.get("sandbox"):
        args.append("--sandbox")

    args.append(input_path)
    return args
```

Update `_run_pandoc` to also support pre-built args:

```python
def _run_pandoc_args(args: list[str]) -> bytes:
    """Run pandoc with pre-built argument list."""
    try:
        proc = subprocess.run(args, check=True, capture_output=True)
    except FileNotFoundError as e:
        raise RuntimeError("pandoc binary not found") from e
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"").decode("utf-8", errors="replace")
        raise RuntimeError(f"pandoc failed: {stderr[:1000]}") from e
    return proc.stdout
```

Update the pandoc track in `_convert`:

```python
    if track == "pandoc":
        source_bytes = await _download_bytes(req.source_download_url)
        suffix = SOURCE_SUFFIX_BY_TYPE.get(req.source_type, ".bin")

        with tempfile.TemporaryDirectory(prefix="ws-pandoc-") as tmp_dir:
            input_path = Path(tmp_dir) / f"source{suffix}"
            input_path.write_bytes(source_bytes)

            if req.pipeline_config:
                # Config-driven: use profile for AST, override to=gfm for markdown
                ast_args = _build_pandoc_args(req.pipeline_config, str(input_path))
                md_config = {**req.pipeline_config, "to": "gfm"}
                md_args = _build_pandoc_args(md_config, str(input_path))
                pandoc_json_bytes = _run_pandoc_args(ast_args)
                markdown_bytes = _run_pandoc_args(md_args)
            else:
                # Legacy: simple reader/writer
                reader = PANDOC_READER_BY_SOURCE_TYPE.get(req.source_type)
                if not reader:
                    raise RuntimeError(f"pandoc track does not support source_type: {req.source_type}")
                markdown_bytes = _run_pandoc(input_path, reader, "gfm")
                pandoc_json_bytes = _build_pandoc_ast_bytes_strict(req.source_type, source_bytes)

        docling_json_bytes = await _maybe_build_docling_json_bytes(req) if req.docling_output is not None else None
        return markdown_bytes, docling_json_bytes, pandoc_json_bytes, None, None
```

**Step 4: Commit**

```bash
git add services/conversion-service/app/main.py
git commit -m "feat: apply pipeline_config to docling and pandoc converters"
```

---

## Task 3: Add `pipeline_config` to callback payload (Python)

**Files:**
- Modify: `services/conversion-service/app/main.py:343-354`

**Step 1: Include pipeline_config in callback**

In the `/convert` endpoint, add `pipeline_config` to the callback payload so conversion-complete can save it:

```python
    callback_payload: dict[str, Any] = {
        "source_uid": body.source_uid,
        "conversion_job_id": body.conversion_job_id,
        "track": _resolve_track(body),
        "md_key": body.output.key,
        "docling_key": None,
        "pandoc_key": None,
        "html_key": None,
        "doctags_key": None,
        "success": False,
        "error": None,
        "pipeline_config": body.pipeline_config,
    }
```

**Step 2: Commit**

```bash
git add services/conversion-service/app/main.py
git commit -m "feat: forward pipeline_config in conversion callback payload"
```

---

## Task 4: Edge function — look up profile and send config (TypeScript/Deno)

**Files:**
- Modify: `supabase/functions/ingest/types.ts` (add `profile_id` to IngestContext)
- Modify: `supabase/functions/ingest/process-convert.ts` (look up profile, send config)

**Step 1: Add profile_id to IngestContext**

```typescript
export type IngestContext = {
  supabaseAdmin: SupabaseClient;
  runtimePolicy: RuntimePolicy;
  ownerId: string;
  ingest_track: IngestTrack;
  source_uid: string;
  source_type: string;
  source_key: string;
  bucket: string;
  fileBytes: Uint8Array;
  originalFilename: string;
  requestedTitle: string;
  project_id: string | null;
  profile_id?: string | null;
};
```

**Step 2: Look up profile in processConversion**

At the top of `processConversion`, after the source_documents insert (line 45), add:

```typescript
  // Look up parsing profile config (if profile_id provided, use it; otherwise use default for track's parser)
  let pipeline_config: Record<string, unknown> | null = null;
  {
    const parser = ingest_track === "docling" ? "docling" : ingest_track === "pandoc" ? "pandoc" : null;
    if (parser) {
      if (ctx.profile_id) {
        const { data } = await supabaseAdmin
          .from("parsing_profiles")
          .select("config")
          .eq("id", ctx.profile_id)
          .eq("parser", parser)
          .maybeSingle();
        if (data) pipeline_config = data.config;
      }
      if (!pipeline_config) {
        // Fall back to default profile
        const { data } = await supabaseAdmin
          .from("parsing_profiles")
          .select("config")
          .eq("parser", parser)
          .contains("config", { is_default: true })
          .maybeSingle();
        if (data) pipeline_config = data.config;
      }
    }
  }
```

**Step 3: Include pipeline_config in fetch body**

In the `JSON.stringify` call (line 148-165), add `pipeline_config`:

```typescript
      body: JSON.stringify({
        source_uid,
        conversion_job_id,
        track: ingest_track,
        source_type,
        source_download_url: signedDownload.signedUrl,
        output: { ... },
        docling_output,
        pandoc_output,
        html_output,
        doctags_output,
        callback_url,
        pipeline_config,
      }),
```

**Step 4: Commit**

```bash
git add supabase/functions/ingest/types.ts supabase/functions/ingest/process-convert.ts
git commit -m "feat: look up parsing profile and send pipeline_config to conversion service"
```

---

## Task 5: Save pipeline_config on callback (TypeScript/Deno)

**Files:**
- Modify: `supabase/functions/conversion-complete/index.ts`

**Step 1: Add pipeline_config to ConversionCompleteBody type**

```typescript
type ConversionCompleteBody = {
  source_uid: string;
  conversion_job_id: string;
  track?: "mdast" | "docling" | "pandoc" | null;
  md_key: string;
  docling_key?: string | null;
  pandoc_key?: string | null;
  html_key?: string | null;
  doctags_key?: string | null;
  success: boolean;
  error?: string | null;
  pipeline_config?: Record<string, unknown> | null;
};
```

**Step 2: Save pipeline_config in conversion_parsing inserts**

In each of the three track branches (pandoc ~line 174, docling ~line 301, mdast ~line 430), add `pipeline_config` to the insert:

```typescript
        .insert({
          conv_uid,
          source_uid,
          conv_status: "success",
          conv_parsing_tool: "pandoc",  // or "docling" or "mdast"
          conv_representation_type: "pandoc_ast_json",
          conv_total_blocks,
          conv_block_type_freq: freqMap,
          conv_total_characters,
          conv_locator: pandoc_key,
          pipeline_config: body.pipeline_config ?? {},
        });
```

**Step 3: Commit**

```bash
git add supabase/functions/conversion-complete/index.ts
git commit -m "feat: save pipeline_config to conversion_parsing on callback"
```

---

## Task 6: Wire profile_id from ingest entry point

**Files:**
- Modify: `supabase/functions/ingest/index.ts` (pass profile_id from request body to IngestContext)

**Step 1: Check what the ingest entry point looks like**

Read `supabase/functions/ingest/index.ts` to understand how IngestContext is constructed, then add `profile_id` from the request body (or query param) into the context.

The ingest function likely accepts a multipart form upload or JSON body. Add `profile_id` as an optional field that callers can provide.

**Step 2: Commit**

```bash
git add supabase/functions/ingest/index.ts
git commit -m "feat: accept profile_id in ingest request and pass to context"
```

---

## Verification

1. **Unit test the Python builder**: Call `_build_docling_converter_from_config` with a "Fast" profile config and verify it doesn't crash.
2. **Unit test `_build_pandoc_args`**: Verify the "Academic LaTeX" profile produces correct CLI args (e.g. `--from latex+smart+tex_math_dollars+citations+footnotes --to json --wrap none --sandbox`).
3. **Integration test**: Upload a PDF through the ingest edge function with a `profile_id` param. Verify:
   - `conversion_parsing.pipeline_config` is populated after ingestion
   - The conversion used the correct profile (check logs or output differences between Fast vs High Quality)
4. **Default fallback**: Upload without `profile_id` — should use the `is_default: true` profile automatically.

---

## Files Summary

| File | Change |
|------|--------|
| `services/conversion-service/app/main.py` | Add `pipeline_config` to request model, add config-aware builders, forward in callback |
| `supabase/functions/ingest/types.ts` | Add `profile_id` to IngestContext |
| `supabase/functions/ingest/process-convert.ts` | Look up profile from DB, send `pipeline_config` |
| `supabase/functions/ingest/index.ts` | Accept `profile_id` from request |
| `supabase/functions/conversion-complete/index.ts` | Save `pipeline_config` to `conversion_parsing` |