---
title: Ingest Pipeline (MD + DOCX)
description: Engineering-level document upload, conversion, and block ingestion flow through Storage and Postgres.
---

This page documents the current repo ingest pipeline end to end: how an upload becomes a `documents_v2` row and `blocks_v2` rows, including identifiers, storage keys, API boundaries, and status transitions.

Scope:
- Primary focus: `md` and `docx`.
- Current repo also accepts: `pdf`, `pptx`, `xlsx`, `html`, `csv`, `txt` through the same non-markdown conversion path.

## Contracts And Identifiers

### `source_uid` (global primary key)

`source_uid` is a **SHA-256 hex** digest computed from the original upload bytes with a type prefix:

```
source_uid = sha256_hex( source_type + "\n" + source_bytes )
```

Properties:
- Primary key of `public.documents_v2`.
- Implies a global dedup behavior: identical bytes for the same `source_type` cannot be uploaded by multiple owners.

Current repo:
- Computed in `supabase/functions/ingest/index.ts`.

### `source_type` (detected from filename extension)

Current repo extension mapping:
- `md`, `markdown` -> `md`
- `docx` -> `docx`
- `pdf` -> `pdf`
- `pptx` -> `pptx`
- `xlsx` -> `xlsx`
- `html`, `htm` -> `html`
- `csv` -> `csv`
- `txt` -> `txt`

Current repo:
- Detection in `supabase/functions/ingest/storage.ts`.

### `conv_uid` (conversion identity)

`conv_uid` is the **stable identity of the parsed representation** used to generate blocks.

For Markdown (`mdast`):
```
conv_uid = sha256_hex( "mdast\nmarkdown_bytes\n" + markdown_bytes )
```

For DOCX via Docling (`doclingdocument_json`):
```
conv_uid = sha256_hex( "docling\ndoclingdocument_json\n" + docling_json_bytes )
```

For conversion-complete mdast fallback (`markdown_bytes`):
```
conv_uid = sha256_hex( "mdast\nmarkdown_bytes\n" + converted_markdown_bytes )
```

Properties:
- Unique in `public.documents_v2.conv_uid`.
- Foreign key target for `public.blocks_v2.conv_uid` (blocks reference `documents_v2(conv_uid)`).

Current repo:
- MD path: `supabase/functions/ingest/process-md.ts`.
- DOCX path: `supabase/functions/conversion-complete/index.ts`.

### `block_uid`

Every block is keyed by the parsed representation and its index:

```
block_uid = `${conv_uid}:${block_index}`
```

Properties:
- Primary key of `public.blocks_v2`.
- `block_index` is dense, zero-based, and ordered by extraction order.

## Storage Layout (Supabase Storage)

Bucket: `DOCUMENTS_BUCKET` (default `"documents"`).

Keys (current repo):
- Original upload: `uploads/<source_uid>/<original_filename>`
- Converted Markdown output: `converted/<source_uid>/<basename>.md`
- Docling sidecar JSON (Docling track): `converted/<source_uid>/<basename>.docling.json`

Current repo:
- Key construction in `supabase/functions/ingest/index.ts` and `supabase/functions/ingest/process-convert.ts`.

## Database Tables (v2)

### `public.documents_v2` (one row per upload)

Minimal fields used by ingest:
- `source_uid` (PK), `owner_id`, `project_id`
- `source_type`, `source_filesize`, `source_total_characters`, `source_locator`
- `doc_title`, `uploaded_at`, `updated_at`
- Conversion metadata: `conv_uid`, `conv_status`, `conv_parsing_tool`, `conv_representation_type`, `conv_total_blocks`, `conv_block_type_freq`, `conv_total_characters`, `conv_locator`
- Pipeline state: `status`, `conversion_job_id`, `error`

Status enum (current repo):
- `uploaded`
- `converting`
- `ingested`
- `conversion_failed`
- `ingest_failed`

Current repo:
- Table definition in `supabase/migrations/20260208022131_003_v2_parallel_documents_blocks.sql`.
- Projects FK in `supabase/migrations/20260209201249_008_projects.sql`.

### `public.blocks_v2` (one row per extracted block)

Minimal fields used by ingest:
- `block_uid` (PK), `conv_uid` (FK), `block_index`
- `block_type`, `block_locator` (JSONB), `block_content`

Locator types (current repo):
- Markdown track: `{ type: "text_offset_range", start_offset, end_offset }`
- Docling track: `{ type: "docling_json_pointer", pointer, page_no? }`

Current repo:
- Table definition in `supabase/migrations/20260208022131_003_v2_parallel_documents_blocks.sql`.

## API Boundaries

### `POST /functions/v1/ingest` (Edge Function)

Input (multipart form):
- `file`: required
- `project_id`: expected by current UI and required by current schema (`documents_v2.project_id` is `NOT NULL`)
- `doc_title`: optional

Outputs (JSON):
- Immediate success (MD path): `{ source_uid, conv_uid, status: "ingested", blocks_count }`
- Conversion accepted (non-MD path): `{ source_uid, conv_uid: null, status: "converting" }` with HTTP `202`
- Existing same-owner row (idempotent short-circuit): returns existing `{ source_uid, conv_uid, status, error? }`
- Failures: `{ source_uid, conv_uid?, status: "conversion_failed" | "ingest_failed", error }`

Current repo:
- Handler: `supabase/functions/ingest/index.ts`
- MD processor: `supabase/functions/ingest/process-md.ts`
- Conversion kickoff: `supabase/functions/ingest/process-convert.ts`

### `POST /functions/v1/conversion-complete` (Edge Function callback)

Called by the conversion service after uploading outputs to Storage.

Auth:
- Requires header `X-Conversion-Service-Key` matching `CONVERSION_SERVICE_KEY`.

Body (JSON):
- `source_uid`, `conversion_job_id`, `md_key`, optional `docling_key`, `success`, optional `error`

Behavior:
- If the document is already ingested with a `conv_uid`, returns idempotent noop (`{ ok: true, noop: true, ... }`).
- Validates `conversion_job_id` matches the current `documents_v2.conversion_job_id`; stale callbacks return HTTP `409`.
- If `success=false`, marks `documents_v2.status="conversion_failed"`.
- Computes `conv_uid` from Docling JSON when `docling_key` is provided.
- Falls back to mdast from converted Markdown when `docling_key` is missing.
- Extracts blocks and writes `blocks_v2`, then finalizes `documents_v2.status = "ingested"`.

Current repo:
- `supabase/functions/conversion-complete/index.ts`

## Pipeline State Machine (`documents_v2.status`)

```
uploaded -> ingested
uploaded -> ingest_failed

converting -> uploaded -> ingested
converting -> conversion_failed
converting -> ingest_failed
```

Important: `converting` implies `conversion_job_id IS NOT NULL` (DB constraint).

Current repo:
- Status check + constraints in `supabase/migrations/20260208022131_003_v2_parallel_documents_blocks.sql`.
- Stale conversion cleanup cron (marks `conversion_failed` after 5 minutes) in `supabase/migrations/20260208024248_004_v2_phase2_runs_overlays_rpc_cron.sql`.

## Markdown Ingest (MD Track)

### End-to-end steps

1. UI calls `POST /functions/v1/ingest` with the file and `project_id`.
2. Edge Function computes:
   - `source_uid` from `md`-typed bytes.
   - `conv_uid` from the markdown bytes (`mdast/markdown_bytes` prefix).
3. Edge Function uploads source bytes to Storage at `uploads/<source_uid>/<filename>`.
4. Edge Function parses Markdown using `remark-parse` + `remark-gfm` and extracts blocks with exact byte offsets.
5. Edge Function inserts:
   - `documents_v2` row with `status="uploaded"` and conversion metadata pre-filled.
   - `blocks_v2` rows with `text_offset_range` locators into the markdown bytes.
6. Edge Function updates `documents_v2.status="ingested"`.

Current repo:
- Markdown parsing and offset extraction: `supabase/functions/_shared/markdown.ts`.
- DB writes: `supabase/functions/ingest/process-md.ts`.

## Non-Markdown Ingest (Conversion Path)

### End-to-end steps

1. UI calls `POST /functions/v1/ingest` with non-MD file and `project_id`.
2. Edge Function computes `source_uid` from `<source_type>`-typed bytes.
3. Edge Function uploads original bytes to Storage at `uploads/<source_uid>/<filename>`.
4. Edge Function inserts `documents_v2` with:
   - `status="converting"`
   - `conversion_job_id = <uuid>`
   - no `conv_uid` yet
5. Edge Function generates signed URLs:
   - Signed download URL for the original file.
   - Signed upload URL for Markdown output at `converted/<source_uid>/<basename>.md`.
   - For Docling-handled types (`docx`, `pdf`, `pptx`, `xlsx`, `html`, `csv`), signed upload URL for Docling JSON at `converted/<source_uid>/<basename>.docling.json`.
   - For `txt`, no Docling JSON target is sent.
6. Edge Function calls the conversion service `POST /convert`.
7. Conversion service:
   - Downloads original bytes via the signed download URL.
   - Uses Docling for non-`txt` source types.
   - Uses direct UTF-8 decode for `txt`.
   - Uploads converted Markdown, and uploads Docling JSON when requested and available.
   - Calls back `POST /functions/v1/conversion-complete` with `source_uid`, `conversion_job_id`, and output keys.
8. `conversion-complete` Edge Function:
   - Verifies job id match.
   - If `docling_key` exists: downloads Docling JSON, computes docling `conv_uid`, extracts `docling_json_pointer` blocks, sets `conv_parsing_tool="docling"`, `conv_representation_type="doclingdocument_json"`.
   - Else: downloads converted markdown (`md_key`), computes mdast `conv_uid`, extracts `text_offset_range` blocks, sets `conv_parsing_tool="mdast"`, `conv_representation_type="markdown_bytes"`.
   - Updates `documents_v2` conversion metadata and sets `status="uploaded"`.
   - Inserts `blocks_v2`.
   - Finalizes `documents_v2.status="ingested"`.

Current repo:
- Conversion kickoff: `supabase/functions/ingest/process-convert.ts`.
- Conversion service contract: `services/conversion-service/README.md`.
- Docling block extraction: `supabase/functions/_shared/docling.ts`.
- Callback + final ingest: `supabase/functions/conversion-complete/index.ts`.

## Failure Modes And Retry Semantics

### Idempotency / retries

On `POST /ingest`, the Edge Function checks `documents_v2` by `source_uid`:
- If the row exists for the same owner and is not failed, the function returns the existing status.
- If the row exists and is `conversion_failed` or `ingest_failed`, the function deletes the stale `documents_v2` row and related `blocks_v2` (by `conv_uid`) and allows a retry.
- If the row exists under a different owner, ingest is rejected (global dedup on `source_uid`).

Current repo:
- `supabase/functions/ingest/validate.ts`.

### `conversion_failed`

Causes:
- Conversion service unreachable or responds non-2xx.
- Stale conversion job (cron timeout, default 5 minutes).
- Conversion service calls back with `success=false`.
- Conversion callback cannot be delivered (best-effort callback; stale conversion cron is fallback).

### `ingest_failed`

Causes:
- Block extraction yields zero blocks.
- DB insert/update failures for `blocks_v2` or `documents_v2`.

## Auth and access checks (ingest path)

- `POST /functions/v1/ingest` requires authenticated user identity.
- `project_id` ownership is validated explicitly in ingest code (service-role DB client bypasses RLS).
- `POST /functions/v1/conversion-complete` requires valid `X-Conversion-Service-Key`.
