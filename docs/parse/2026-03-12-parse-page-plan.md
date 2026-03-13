# Parse Page — Full Stack Plan

> 2026-03-12 — Batch document parsing with Docling profile config, end-to-end.
> Save to: `E:\writing-system\docs\parse\2026-03-12-parse-page-plan.md`

---

## Context

Project assets are uploaded to Supabase Storage via the `ingest` edge function but sit in `uploaded` status without being parsed. The `parsing_profiles` table exists with 4 seeded Docling profiles (Fast, Balanced, High Quality, AI Vision) and a full config schema is documented in `docs/pipeline/2026-03-10-parsing-pipeline-profiles.md` — but nothing connects profiles to the actual conversion pipeline.

**This plan covers the full stack:**
1. **Frontend** — Parse page UI with asset list, profile selector, inline config editor, batch parse, status tracking, JSON view/download
2. **Edge functions** — `trigger-parse` forwards `profile_id` + `pipeline_config` to the conversion service
3. **Python conversion service** — `build_converter_from_config()` translates jsonb profile config into Docling `DocumentConverter` with correct OCR engine, table mode, enrichments, etc.

After parsing, each file produces:
- **Atomic blocks** in the `blocks` table
- **DoclingDocument JSON** in `conversion_representations` / Supabase Storage at `converted/{source_uid}/{baseName}.docling.json`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  ParsePage.tsx                                                   │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │ Profile       │  │ Config Editor    │  │ File List         │  │
│  │ Selector      │  │ (inline panel)   │  │ + Status + Actions│  │
│  └──────┬───────┘  └────────┬─────────┘  └────────┬──────────┘  │
│         │                   │                      │             │
│         └───────────┬───────┘                      │             │
│                     ▼                              │             │
│         useBatchParse hook ◄───────────────────────┘             │
│              │ (concurrency: 3)                                  │
└──────────────┼───────────────────────────────────────────────────┘
               │ POST /functions/v1/trigger-parse
               │ { source_uid, profile_id, pipeline_config }
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  trigger-parse (Edge Function)                                    │
│  1. Validate ownership + parseable status                         │
│  2. Load profile config from parsing_profiles (if profile_id)     │
│  3. Create signed URLs for all output artifacts                   │
│  4. POST /convert to conversion service with pipeline_config      │
│  5. Return 202 { source_uid, status: "converting" }               │
└──────────────┬───────────────────────────────────────────────────┘
               │ POST /convert { ..., pipeline_config }
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  Conversion Service (platform-api on GCP)                         │
│  1. build_converter_from_config(pipeline_config)                  │
│     → DocumentConverter with correct OCR, tables, enrichments     │
│  2. converter.convert(source_download_url)                        │
│  3. Export: markdown, docling.json, html, doctags                 │
│  4. Upload artifacts to signed URLs                               │
│  5. POST callback to conversion-complete                          │
└──────────────┬───────────────────────────────────────────────────┘
               │ POST /functions/v1/conversion-complete
               │ { source_uid, success, pipeline_config, ... }
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  conversion-complete (Edge Function)                              │
│  1. Extract blocks via extractDoclingBlocks()                     │
│  2. Insert blocks into blocks table                               │
│  3. Insert conversion_parsing row with pipeline_config            │
│  4. Insert conversion_representations rows                        │
│  5. Update source_documents.status = 'ingested'                   │
└──────────────────────────────────────────────────────────────────┘
               │ Realtime subscription
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  ParsePage.tsx — status updates live via postgres_changes         │
│  Row transitions: uploaded → converting → ingested (or *_failed)  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Format → Pipeline Mapping

| Format | Pipeline | Backend | Configurable? |
|--------|----------|---------|---------------|
| PDF | StandardPdfPipeline | DoclingParseDocumentBackend | Full config |
| IMAGE (jpg/png/tiff/webp/bmp) | StandardPdfPipeline | ImageDocumentBackend | Full config |
| METS_GBS | StandardPdfPipeline | MetsGbsDocumentBackend | Full config |
| DOCX | SimplePipeline | MsWordDocumentBackend | Enrichments only |
| PPTX | SimplePipeline | MsPowerpointDocumentBackend | Enrichments only |
| XLSX | SimplePipeline | MsExcelDocumentBackend | Enrichments only |
| HTML | SimplePipeline | HTMLDocumentBackend | Enrichments + backend opts |
| MD | SimplePipeline | MarkdownDocumentBackend | Enrichments + backend opts |
| CSV | SimplePipeline | CsvDocumentBackend | Enrichments only |
| TXT | SimplePipeline | — | Enrichments only |
| ASCIIDOC | SimplePipeline | AsciiDocBackend | Enrichments only |
| LATEX | SimplePipeline | LatexDocumentBackend | Enrichments + backend opts |
| RST | SimplePipeline | — | Enrichments only |
| ODT | SimplePipeline | — | Enrichments only |
| EPUB | SimplePipeline | — | Enrichments only |
| RTF | SimplePipeline | — | Enrichments only |
| ORG | SimplePipeline | — | Enrichments only |
| XML_JATS | SimplePipeline | JatsDocumentBackend | Enrichments only |
| XML_USPTO | SimplePipeline | PatentUsptoDocumentBackend | Enrichments only |
| XML_XBRL | SimplePipeline | XBRLDocumentBackend | Enrichments + backend opts |
| JSON | SimplePipeline | — | Enrichments only |
| JSONL | SimplePipeline | — | Enrichments only |
| JSON_DOCLING | SimplePipeline | DoclingJSONBackend | Enrichments only |
| VTT | SimplePipeline | WebVTTDocumentBackend | Enrichments only |
| WAV/MP3/M4A | AsrPipeline | NoOpBackend | ASR options only |

**Note:** MD files are parsed instantly by `mdast` in the ingest edge function — they don't go through the conversion service. The Parse page should show them as "N/A" or auto-ingested.

---

## Step 1: Nav Entry + Route

### 1a. nav-config.ts

**File:** `web/src/components/shell/nav-config.ts`

Add `IconScan` to the tabler imports (line 2 area). Insert after Assets entry (line 75):

```typescript
// Before:
{ label: 'Assets', icon: IconFolder, path: '/app/assets' },
{ label: 'Edit', icon: IconFileText, path: '/app/docs' },

// After:
{ label: 'Assets', icon: IconFolder, path: '/app/assets' },
{ label: 'Parse', icon: IconScan, path: '/app/parse' },
{ label: 'Edit', icon: IconFileText, path: '/app/docs' },
```

### 1b. router.tsx

**File:** `web/src/router.tsx`

Add import at top:
```typescript
import ParsePage from '@/pages/ParsePage';
```

Add route after `/app/assets` (line 117):
```typescript
{ path: '/app/assets', element: <ProjectAssetsPage /> },
{ path: '/app/parse', element: <ParsePage /> },
```

---

## Step 2: ParsePage.tsx (Frontend)

**New file:** `web/src/pages/ParsePage.tsx`

### Page structure

```
┌─────────────────────────────────────────────────────────┐
│ TOOLBAR                                                  │
│ ┌────────────────┐  ┌──────────────┐  ┌───────────────┐ │
│ │ Profile: [▼]   │  │ ⚙ Config     │  │ Parse All (12)│ │
│ │ Balanced       │  │   Editor     │  │ Parse Sel (3) │ │
│ └────────────────┘  └──────────────┘  └───────────────┘ │
│                                                          │
│ Progress: ████████░░░░ 8/12 parsed  │ 2 converting      │
├──────────────────────────────────────────────────────────┤
│ CONFIG EDITOR (collapsible panel)                        │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Pipeline: standard ▼  │ OCR: easyocr ▼  │ Lang: en  │ │
│ │ Table mode: fast ▼    │ Do OCR: ✓       │           │ │
│ │ Enrichments:                                         │ │
│ │   ☐ Picture classification  ☐ Picture description    │ │
│ │   ☐ Chart extraction                                 │ │
│ │ [Save as new profile]                                │ │
│ └──────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│ FILE LIST                                                │
│ ☐ │ Name              │ Format │ Size  │ Pipeline │ Status    │ Actions        │
│ ──┼───────────────────┼────────┼───────┼──────────┼───────────┼────────────────│
│ ☑ │ report.pdf        │ PDF    │ 2.1MB │ standard │ uploaded  │ [▶ Parse]      │
│ ☐ │ slides.pptx       │ PPTX   │ 5.4MB │ simple   │ converting│ ⟳             │
│ ☐ │ paper.pdf         │ PDF    │ 1.2MB │ standard │ ✓ success │ [View] [DL]    │
│ ☐ │ data.xlsx         │ XLSX   │ 340KB │ simple   │ ✗ failed  │ [▶ Retry]      │
│ ☐ │ notes.md          │ MD     │ 12KB  │ mdast    │ ✓ success │ [View]         │
│ ☐ │ contract.docx     │ DOCX   │ 890KB │ simple   │ uploaded  │ [▶ Parse]      │
│ ☐ │ scan.jpg          │ IMAGE  │ 3.1MB │ standard │ uploaded  │ [▶ Parse]      │
│ ☐ │ audio.mp3         │ MP3    │ 15MB  │ asr      │ uploaded  │ [▶ Parse]      │
└──────────────────────────────────────────────────────────┘
```

### Component breakdown

**1. Profile selector (dropdown)**
- Fetch on mount: `supabase.from('parsing_profiles').select('id, parser, config').eq('parser', 'docling').order('id')`
- Display profile name from `config.name` field
- Auto-select the profile where `config.is_default === true`
- Selecting a profile loads its `config` into the config editor state

**2. Config editor (collapsible panel)**
- Reuse the structured form pattern from `web/src/pages/settings/DoclingConfigPanel.tsx`
- Sections:
  - **Pipeline type:** standard / vlm / asr (radio or dropdown)
  - **OCR settings** (visible when pipeline=standard): engine kind, languages, force full page OCR
  - **Table structure** (visible when pipeline=standard): mode (fast/accurate), cell matching
  - **Enrichments** (always visible): picture classification, picture description, chart extraction
  - **VLM settings** (visible when pipeline=vlm): preset, response format
  - **ASR settings** (visible when pipeline=asr): engine, preset
- **Ephemeral by default** — edits apply to this parse run only
- **"Save as new profile" button** — inserts a new row into `parsing_profiles`
- State: `configState: Record<string, unknown>` initialized from selected profile's `config`

**3. File list (table with ScrollArea)**
- Data source: `fetchAllProjectDocuments(supabase, projectId)` — returns `ProjectDocumentRow[]`
- Columns:
  - **Checkbox** — for multi-select
  - **Name** — `doc_title` or filename from `source_locator`
  - **Format** — `getDocumentFormat(doc)` (from projectDetailHelpers.ts)
  - **Size** — `formatBytes(doc.source_filesize)`
  - **Pipeline** — derived from `source_type` using `FORMAT_PIPELINE` map (client-side)
  - **Status** — `StatusBadge` component (reuse from ProjectAssetsPage):
    - `uploaded` → gray "unparsed"
    - `converting` → blue with spinner "converting"
    - `ingested` → green "success"
    - `conversion_failed` / `ingest_failed` → red "failed" with error tooltip from `doc.error`
  - **Actions** — status-dependent:
    - Unparsed/failed: play button (▶) triggers single-file parse
    - Converting: disabled spinner
    - Ingested: "View JSON" button + "Download JSON" button

**4. Progress bar**
- Computed from docs array: count by status
- Format: "8 / 12 parsed | 2 converting | 1 failed"

**5. View JSON modal**
- Triggered by "View JSON" action on ingested files
- Fetch DoclingDocument JSON:
  1. Query `conversion_representations` for `source_uid` to get the storage key (e.g. `converted/{source_uid}/{baseName}.docling.json`)
  2. Create signed URL: `supabase.storage.from('documents').createSignedUrl(key, 60 * 20)`
  3. Fetch JSON content
- Display in a modal with read-only JSON tree (reuse `JsonNode` recursive renderer pattern from `DoclingProfileEditor.tsx`)

**6. Download JSON**
- Same signed URL creation, then `window.open(url)` or create an `<a>` element with `download` attribute

### Key patterns to reuse

| Pattern | Source file | What to reuse |
|---------|-------------|---------------|
| Page layout + project context | `web/src/pages/ProjectAssetsPage.tsx` | `useProjectFocus()`, `useShellHeaderTitle()`, ScrollArea, table structure |
| Status badge | `web/src/pages/ProjectAssetsPage.tsx:26-41` | `StatusBadge` component (extract or copy) |
| Document fetching | `web/src/lib/projectDocuments.ts` | `fetchAllProjectDocuments()` |
| Format detection + helpers | `web/src/lib/projectDetailHelpers.ts` | `getDocumentFormat()`, `formatBytes()`, signed URL creation |
| Config panel UI | `web/src/pages/settings/DoclingConfigPanel.tsx` | Collapsible sections, form fields for Docling options |
| JSON tree viewer | `web/src/pages/superuser/DoclingProfileEditor.tsx` | `JsonNode` recursive component for read-only JSON display |
| Profile type | `web/src/pages/superuser/DoclingProfileEditor.tsx:9-13` | `ParsingProfile` type: `{ id, parser, config }` |

---

## Step 3: useBatchParse Hook

**New file:** `web/src/hooks/useBatchParse.ts`

### Interface

```typescript
type BatchParseOptions = {
  profileId: string;
  pipelineConfig: Record<string, unknown>;
  concurrency?: number; // default 3
};

type FileDispatchStatus = 'idle' | 'queued' | 'dispatching' | 'dispatched' | 'dispatch_error';

type UseBatchParseReturn = {
  /** Per-file dispatch status (separate from DB status) */
  dispatchStatus: Map<string, FileDispatchStatus>;
  /** Aggregate progress */
  progress: { queued: number; dispatching: number; dispatched: number; errors: number; total: number };
  /** Start batch dispatch for given source_uids */
  start: (sourceUids: string[]) => void;
  /** Stop dispatching new files (in-flight complete naturally) */
  cancel: () => void;
  /** Whether a batch is currently in progress */
  isRunning: boolean;
  /** Per-file error messages */
  errors: Map<string, string>;
};

function useBatchParse(options: BatchParseOptions): UseBatchParseReturn;
```

### Implementation details

1. **Concurrency-limited queue:** Maintain a queue of `source_uid`s. Process up to `concurrency` (default 3) simultaneously.

2. **Per-file dispatch:** For each file:
   ```typescript
   const response = await fetch(`${supabaseUrl}/functions/v1/trigger-parse`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${session.access_token}`,
     },
     body: JSON.stringify({
       source_uid,
       profile_id: options.profileId,
       pipeline_config: options.pipelineConfig,
     }),
   });
   ```

3. **Status tracking:**
   - `queued` → waiting in the queue
   - `dispatching` → fetch in progress
   - `dispatched` → got 202 back, conversion service is processing
   - `dispatch_error` → fetch failed or got non-2xx response

4. **Dispatch vs DB status:** The hook tracks *dispatch* status only (did we successfully call trigger-parse?). The actual conversion status (`converting` → `ingested`) comes from the realtime subscription in ParsePage.tsx. These are independent.

5. **Cancellation:** Set a `cancelled` ref. The queue loop checks it before dispatching the next file. In-flight requests complete.

6. **Error handling:** On dispatch error, record the error message, continue with remaining files.

---

## Step 4: trigger-parse Edge Function Changes

**File:** `supabase/functions/trigger-parse/index.ts`

### Current request body (line 29)
```typescript
const { source_uid } = await req.json() as { source_uid?: string };
```

### New request body
```typescript
const { source_uid, profile_id, pipeline_config: configOverride } = await req.json() as {
  source_uid?: string;
  profile_id?: string;
  pipeline_config?: Record<string, unknown>;
};
```

### Profile resolution logic (insert after line 53, after runtimePolicy load)

```typescript
// Resolve pipeline config: explicit override > profile lookup > empty (service defaults)
let pipeline_config: Record<string, unknown> = {};

if (configOverride && Object.keys(configOverride).length > 0) {
  // Client sent an explicit config (possibly edited from a profile)
  pipeline_config = configOverride;
} else if (profile_id) {
  // Load config from parsing_profiles table
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('parsing_profiles')
    .select('config')
    .eq('id', profile_id)
    .single();
  if (profileErr) throw new Error(`Profile lookup failed: ${profileErr.message}`);
  pipeline_config = (profile.config as Record<string, unknown>) ?? {};
}
```

### Forward config to conversion service (line 198-215, the JSON.stringify body)

Add `pipeline_config` to the request body sent to the conversion service:

```typescript
body: JSON.stringify({
  source_uid,
  conversion_job_id,
  track,
  source_type,
  source_download_url: signedDownload.signedUrl,
  pipeline_config,          // ← NEW
  output: { ... },
  docling_output,
  pandoc_output,
  html_output,
  doctags_output,
  callback_url,
}),
```

### Forward config through callback

The conversion service sends callback payload to `conversion-complete`. The service should echo `pipeline_config` back in the callback. But since we control both sides, we can also have `trigger-parse` store the config directly. Two options:

**Option A (simpler):** Before calling the conversion service, insert `pipeline_config` into a temporary store (e.g., update `source_documents` with a jsonb field or use `conversion_job_id` as a key).

**Option B (cleaner):** The conversion service echoes `pipeline_config` in the callback payload. `conversion-complete` reads it and persists to `conversion_parsing.pipeline_config`.

**Recommended: Option B** — the conversion service already echoes `source_uid`, `conversion_job_id`, `track`, etc. Adding `pipeline_config` is one more field.

---

## Step 5: Conversion Service — Python Changes

### 5a. ConvertRequest model

**File:** `services/platform-api/app/domain/conversion/models.py`

```python
class ConvertRequest(BaseModel):
    source_uid: str
    conversion_job_id: str
    track: Optional[str] = Field(default=None, pattern=r"^(mdast|docling|pandoc)$")
    source_type: str
    source_download_url: str
    output: OutputTarget
    docling_output: Optional[OutputTarget] = None
    pandoc_output: Optional[OutputTarget] = None
    html_output: Optional[OutputTarget] = None
    doctags_output: Optional[OutputTarget] = None
    callback_url: str
    pipeline_config: Optional[dict] = None   # ← NEW
```

Same change in `services/conversion-service/app/main.py` (legacy `ConvertRequest` class, line 46-57).

### 5b. build_converter_from_config()

**File:** `services/platform-api/app/domain/conversion/service.py`

Replace `_build_docling_converter()` with the full translation layer from the design doc. The implementation is already specified in `docs/pipeline/2026-03-10-parsing-pipeline-profiles.md` section 3.

```python
"""Translate platform jsonb config → docling DocumentConverter."""

from docling.document_converter import DocumentConverter, PdfFormatOption, ImageFormatOption
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions, EasyOcrOptions, TesseractCliOcrOptions,
    TesseractOcrOptions, RapidOcrOptions, OcrMacOptions, OcrAutoOptions,
    TableStructureOptions, TableFormerMode, LayoutOptions,
    AcceleratorOptions, AcceleratorDevice,
)
from docling.datamodel.base_models import InputFormat

OCR_ENGINE_MAP = {
    "auto": OcrAutoOptions,
    "easyocr": EasyOcrOptions,
    "tesseract": TesseractCliOcrOptions,
    "tesserocr": TesseractOcrOptions,
    "rapidocr": RapidOcrOptions,
    "ocrmac": OcrMacOptions,
}

DEVICE_MAP = {
    "auto": AcceleratorDevice.AUTO,
    "cpu": AcceleratorDevice.CPU,
    "cuda": AcceleratorDevice.CUDA,
    "mps": AcceleratorDevice.MPS,
}


def build_converter_from_config(config: dict | None) -> DocumentConverter:
    """Build a DocumentConverter from a platform jsonb config dict.

    When config is None or empty, returns a default DocumentConverter.
    Config fields mirror docling's Pydantic field names exactly.
    Omitted fields use docling defaults.
    """
    if not config:
        return DocumentConverter()

    pipeline_mode = config.get("pipeline", "standard")

    # ── Accelerator ──
    accel_cfg = config.get("accelerator_options", {})
    accel = AcceleratorOptions(
        device=DEVICE_MAP.get(accel_cfg.get("device", "auto"), AcceleratorDevice.AUTO),
        num_threads=accel_cfg.get("num_threads", 4),
    )

    if pipeline_mode == "standard":
        pdf_cfg = config.get("pdf_pipeline", {})

        # OCR
        ocr_cfg = pdf_cfg.get("ocr_options", {})
        ocr_kind = ocr_cfg.get("kind", "auto")
        ocr_cls = OCR_ENGINE_MAP.get(ocr_kind, OcrAutoOptions)
        ocr_kwargs = {
            k: v for k, v in ocr_cfg.items()
            if k != "kind" and k in ocr_cls.model_fields
        }
        ocr_opts = ocr_cls(**ocr_kwargs)

        # Table structure
        table_cfg = pdf_cfg.get("table_structure_options", {})
        table_mode = (
            TableFormerMode.ACCURATE
            if table_cfg.get("mode", "accurate") == "accurate"
            else TableFormerMode.FAST
        )
        table_opts = TableStructureOptions(
            mode=table_mode,
            do_cell_matching=table_cfg.get("do_cell_matching", True),
        )

        # Layout
        layout_cfg = pdf_cfg.get("layout_options", {})
        layout_opts = LayoutOptions()
        # Apply layout config fields if present
        for field in ("create_orphan_clusters", "keep_empty_clusters", "skip_cell_assignment"):
            if field in layout_cfg:
                setattr(layout_opts, field, layout_cfg[field])

        # Enrichments
        enrich = config.get("enrichments", {})

        pipeline_options = PdfPipelineOptions(
            do_ocr=pdf_cfg.get("do_ocr", True),
            ocr_options=ocr_opts,
            layout_options=layout_opts,
            do_table_structure=pdf_cfg.get("do_table_structure", True),
            table_structure_options=table_opts,
            do_code_enrichment=pdf_cfg.get("do_code_enrichment", False),
            do_formula_enrichment=pdf_cfg.get("do_formula_enrichment", False),
            do_picture_classification=enrich.get("do_picture_classification", False),
            do_picture_description=enrich.get("do_picture_description", False),
            do_chart_extraction=enrich.get("do_chart_extraction", False),
            images_scale=pdf_cfg.get("images_scale", 1.0),
            generate_page_images=pdf_cfg.get("generate_page_images", False),
            generate_picture_images=pdf_cfg.get("generate_picture_images", False),
            accelerator_options=accel,
            document_timeout=config.get("document_timeout"),
        )

        # Apply to both PDF and IMAGE formats
        from docling.pipeline.standard_pdf_pipeline import StandardPdfPipeline
        format_options = {
            InputFormat.PDF: PdfFormatOption(
                pipeline_cls=StandardPdfPipeline,
                pipeline_options=pipeline_options,
            ),
            InputFormat.IMAGE: ImageFormatOption(
                pipeline_cls=StandardPdfPipeline,
                pipeline_options=pipeline_options,
            ),
        }

    elif pipeline_mode == "vlm":
        from docling.pipeline.vlm_pipeline import VlmPipeline
        from docling.datamodel.pipeline_options import VlmPipelineOptions, VlmConvertOptions

        vlm_cfg = config.get("vlm_pipeline", {})
        vlm_opts_cfg = vlm_cfg.get("vlm_options", {})
        preset = vlm_opts_cfg.get("preset", "granite_docling")
        vlm_convert = VlmConvertOptions.from_preset(preset)

        enrich = config.get("enrichments", {})

        pipeline_options = VlmPipelineOptions(
            vlm_options=vlm_convert,
            do_picture_classification=enrich.get("do_picture_classification", False),
            do_picture_description=enrich.get("do_picture_description", False),
            do_chart_extraction=enrich.get("do_chart_extraction", False),
            accelerator_options=accel,
            document_timeout=config.get("document_timeout"),
        )

        format_options = {
            InputFormat.PDF: PdfFormatOption(
                pipeline_cls=VlmPipeline,
                pipeline_options=pipeline_options,
            ),
            InputFormat.IMAGE: ImageFormatOption(
                pipeline_cls=VlmPipeline,
                pipeline_options=pipeline_options,
            ),
        }

    elif pipeline_mode == "asr":
        # ASR pipeline — audio formats
        # Import conditionally since docling[asr] may not be installed
        try:
            from docling.pipeline.asr_pipeline import AsrPipeline
            from docling.datamodel.pipeline_options import AsrPipelineOptions
            asr_cfg = config.get("asr_pipeline", {})
            asr_opts_cfg = asr_cfg.get("asr_options", {})
            # ASR options TBD based on docling version
        except ImportError:
            pass
        format_options = {}

    else:
        # Unknown pipeline mode — use defaults
        format_options = {}

    return DocumentConverter(format_options=format_options)
```

### 5c. Update convert() to use config

In `service.py`, change the docling track branch (line 160-169):

```python
# Before:
if track == "docling":
    converter = _build_docling_converter()

# After:
if track == "docling":
    converter = build_converter_from_config(req.pipeline_config)
```

### 5d. Echo pipeline_config in callback

In the `/convert` endpoint handler (both `platform-api/app/api/routes/conversion.py` and `conversion-service/app/main.py`), add `pipeline_config` to the callback payload:

```python
callback_payload = {
    "source_uid": body.source_uid,
    "conversion_job_id": body.conversion_job_id,
    "track": resolve_track(body),
    "pipeline_config": body.pipeline_config,   # ← NEW
    # ... rest unchanged
}
```

### 5e. Same changes in legacy conversion-service

Mirror all changes in `services/conversion-service/app/main.py`:
- Add `pipeline_config` to `ConvertRequest` model (line 46-57)
- Replace `_build_docling_converter()` call with `build_converter_from_config(body.pipeline_config)`
- Add `pipeline_config` to callback payload (line 351-362)

---

## Step 6: conversion-complete Edge Function

**File:** `supabase/functions/conversion-complete/index.ts`

### Accept pipeline_config from callback

In the callback payload parsing, add `pipeline_config`:

```typescript
const { pipeline_config, ...rest } = payload;
```

### Persist to conversion_parsing

When inserting the `conversion_parsing` row, include `pipeline_config`:

```typescript
await supabaseAdmin.from('conversion_parsing').insert({
  conv_uid,
  source_uid,
  conv_parsing_tool: track === 'docling' ? 'docling' : track,
  conv_representation_type: ...,
  conv_total_blocks: blocks.length,
  pipeline_config: pipeline_config ?? {},   // ← NEW
  // ... rest unchanged
});
```

The `pipeline_config` column already exists on `conversion_parsing` (added by migration `20260310120000_075_parsing_pipeline_config.sql`).

---

## Step 7: Realtime Status Updates

In `ParsePage.tsx`, subscribe to `source_documents` changes:

```typescript
useEffect(() => {
  if (!resolvedProjectId) return;

  const channel = supabase
    .channel(`parse-status-${resolvedProjectId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'source_documents',
        filter: `project_id=eq.${resolvedProjectId}`,
      },
      (payload) => {
        const updated = payload.new as ProjectDocumentRow;
        setDocs(prev =>
          prev.map(d => d.source_uid === updated.source_uid ? { ...d, ...updated } : d)
        );
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [resolvedProjectId]);
```

**Important:** Subscribe to `source_documents` (the actual table), not `view_documents` (the read-only view). Realtime only works on tables.

---

## Files Summary

| File | Action | Layer |
|------|--------|-------|
| `web/src/components/shell/nav-config.ts` | Add Parse nav entry | Frontend |
| `web/src/router.tsx` | Add `/app/parse` route | Frontend |
| `web/src/pages/ParsePage.tsx` | **Create** — main page | Frontend |
| `web/src/hooks/useBatchParse.ts` | **Create** — batch dispatch | Frontend |
| `supabase/functions/trigger-parse/index.ts` | Accept profile_id + pipeline_config, forward to service | Edge |
| `supabase/functions/conversion-complete/index.ts` | Persist pipeline_config | Edge |
| `services/platform-api/app/domain/conversion/models.py` | Add pipeline_config to ConvertRequest | Python |
| `services/platform-api/app/domain/conversion/service.py` | Implement build_converter_from_config() | Python |
| `services/platform-api/app/api/routes/conversion.py` | Echo pipeline_config in callback | Python |
| `services/conversion-service/app/main.py` | Mirror all platform-api changes (legacy) | Python |

---

## Verification Checklist

### Frontend
- [ ] "Parse" nav entry appears below "Assets" in sidebar
- [ ] Clicking navigates to `/app/parse`
- [ ] File list loads all project assets with correct format, pipeline, status
- [ ] Profile dropdown shows all `parsing_profiles` rows, default auto-selected
- [ ] Config editor toggle shows/hides inline config panel
- [ ] Config fields reflect selected profile's config
- [ ] Editing config fields updates the ephemeral config state
- [ ] "Save as new profile" creates a new row in `parsing_profiles`

### Single file parse
- [ ] Click play on one `uploaded` file
- [ ] Status transitions: `uploaded` → `converting` (with spinner) → `ingested` (green "success")
- [ ] Realtime subscription drives the status update (no polling)

### Batch parse
- [ ] "Parse All Unparsed" dispatches all parseable files
- [ ] Concurrency limited to 3 simultaneous requests
- [ ] Progress bar updates as files dispatch and complete
- [ ] "Cancel" stops new dispatches; in-flight complete
- [ ] "Parse Selected" only dispatches checked files

### Config forwarding
- [ ] `trigger-parse` request body includes `pipeline_config`
- [ ] Conversion service receives `pipeline_config` in `/convert` request
- [ ] Callback echoes `pipeline_config` to `conversion-complete`
- [ ] `conversion_parsing.pipeline_config` column populated after completion
- [ ] Selecting "High Quality" profile (accurate tables) produces different output than "Fast" (fast tables)

### View/Download
- [ ] "View JSON" on ingested file opens modal with DoclingDocument JSON tree
- [ ] "Download JSON" triggers browser download of `.docling.json` file
- [ ] Signed URLs work correctly (20-minute expiry)

### Error handling
- [ ] Failed conversions show red badge with error tooltip
- [ ] Play button on failed files triggers re-parse
- [ ] MD files show as auto-ingested (mdast track, no conversion service needed)
