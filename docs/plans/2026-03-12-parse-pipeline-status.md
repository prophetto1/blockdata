# Parse Pipeline: Status and Onboarding Guide

**Date:** 2026-03-12

## What This System Does

The parse pipeline converts uploaded documents into structured, searchable blocks. Users upload files through a web UI. Edge functions ingest each file, dispatch it to a conversion service, and store the results in PostgreSQL. Downstream features — annotation, AI processing, search — consume these blocks.

The pipeline handles PDF, DOCX, PPTX, XLSX, Markdown, and plain text.

## Architecture

The pipeline moves each document through four stages:

1. **Upload.** The user selects files in the web UI. The `ingest` edge function stores each file and writes a row to `source_documents` with status `uploaded`.
2. **Dispatch.** The user triggers parsing from the Parse page (`/app/parse`). The `trigger-parse` edge function validates ownership, resolves the selected parsing profile, creates signed URLs, and sends a request to the conversion service.
3. **Convert.** A GCP Cloud Run service (`blockdata-platform-api`) runs Docling, IBM's document AI library. Docling produces four outputs: a DoclingDocument JSON (hierarchical structure with bounding boxes and reading order), markdown, HTML, and doctags.
4. **Store.** The `conversion-complete` edge function receives a callback from the conversion service, extracts atomic blocks from the DoclingDocument JSON, and writes them to the `blocks` table. It also stores the full representations in `conversion_representations` and sets the document status to `ingested`.

## Parsing Profiles

The `parsing_profiles` table stores Docling configuration presets: Fast, Balanced, High Quality, and AI Vision. Each profile controls:

- Pipeline type (standard OCR vs. vision language model)
- OCR engine (easyocr, tesseract, rapidocr)
- Table structure mode (fast vs. accurate)
- Enrichments (picture classification, description, chart extraction)

The Parse page lets users choose a profile before they start parsing.

## What Works

- Upload and ingest flow stores files and creates `source_documents` rows.
- The Parse page displays a file list with status badges, supports batch parsing, and offers a profile selector.
- `trigger-parse` validates ownership, resolves profile config, creates signed URLs, and dispatches to the conversion service.
- `conversion-complete` receives callbacks, extracts blocks, and stores representations.
- The GCP conversion service runs with two workers and responds to `/convert` requests.
- Delete and reset RPCs (`delete_source_document()`, `reset_source_document()`) work.
- The markdown preview panel renders Docling's markdown export with `react-markdown` and `remark-gfm`.
- All file types, including Markdown and plain text, route through Docling. The old mdast inline parser is retired.

## What Needs Work

Five tasks remain before the pipeline operates end to end with profile support:

1. **Build converter from config.** The Python conversion service (`services/platform-api/`) ignores the profile JSON config. `build_converter_from_config()` must translate the profile into Docling's `DocumentConverter` with the correct OCR engine, table mode, and enrichments.
2. **Forward pipeline_config through the callback.** `trigger-parse` sends the config to the conversion service. The service must echo it in its callback so `conversion-complete` can persist it to `conversion_parsing.pipeline_config`.
3. **Investigate failed conversions.** Twenty-one documents show `conversion_failed`; five show `ingest_failed`. Diagnose and fix the errors.
4. **Deploy trigger-parse.** Local changes to the edge function have not yet been deployed to Supabase.
5. **Polish the markdown preview.** The preview panel may need prose/typography CSS classes for readable rendering.

## Key Files

### Edge Functions (Deno/TypeScript)

| File | Purpose |
|------|---------|
| `supabase/functions/trigger-parse/index.ts` | Dispatches parse jobs to the conversion service |
| `supabase/functions/conversion-complete/index.ts` | Receives callback, extracts blocks, stores results |
| `supabase/functions/ingest/index.ts` | Handles file upload |
| `supabase/functions/_shared/docling.ts` | DoclingDocument types and block extraction logic |
| `supabase/functions/_shared/admin_policy.ts` | Runtime policy with file-extension-to-track routing |
| `supabase/functions/_shared/markdown.ts` | Legacy mdast block extraction (no longer primary) |

### Python Conversion Service

| File | Purpose |
|------|---------|
| `services/platform-api/app/domain/conversion/service.py` | Docling conversion logic |
| `services/platform-api/app/domain/conversion/models.py` | `ConvertRequest` model definition |
| `services/platform-api/app/api/routes/conversion.py` | `/convert` HTTP endpoint |

### Frontend (React/TypeScript)

| File | Purpose |
|------|---------|
| `web/src/pages/ParsePage.tsx` | Parse page: file list, preview panel, batch controls |
| `web/src/hooks/useBatchParse.ts` | Concurrency-limited batch dispatch |
| `web/src/lib/projectDocuments.ts` | Document fetching utilities |

### Database

Migrations live in `supabase/migrations/`. The core tables are `source_documents`, `blocks`, `conversion_parsing`, `conversion_representations`, and `parsing_profiles`.
