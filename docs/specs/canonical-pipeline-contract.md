# Canonical Pipeline Contract (Directional, Stable)

This document exists to preserve the **directional + technically-binding** decisions for the Writing System / MD-Annotate pipeline so work can resume safely after crashes.

Scope:
- Defines the canonical **artifacts**, **storage paths**, **DB invariants**, and **ingest/extract/export flows**.
- Records *why* certain choices are locked (Edge runtime, offsets, idempotency).
- Does **not** replace the PRD; it is the “architecture contract” that the PRD references.

Non-goals:
- UI design details.
- Model/worker protocol beyond Phase 2 scaffolding.

---

## Canonical Output Shape (One Block Record)

Every exported JSONL line is a JSON object with exactly these top-level keys (order matters):

```json
{
  "immutable": {
    "immutable_schema_ref": "md_prose_v1",
    "envelope": {
      "doc_uid": "…",
      "source_uid": "…",
      "md_uid": "…",
      "source_type": "md",
      "source_locator": "…",
      "md_locator": "…",
      "doc_title": "…",
      "uploaded_at": "…",
      "block_uid": "…",
      "block_type": "paragraph",
      "block_index": 0,
      "section_path": ["…"],
      "char_span": [0, 0]
    },
    "content": { "original": "…" }
  },
  "annotation": {
    "schema_ref": null,
    "schema_uid": null,
    "data": {}
  }
}
```

Directional rule:
- Everything under `immutable` is **never mutated** after ingest (except lifecycle/status fields on `documents`).
- Everything under `annotation` is an **overlay** scoped to a run.

---

## Artifacts (What We Persist, Always)

### A) Original source artifact (always)

Definition:
- The exact bytes uploaded by the user (e.g., `.docx`, `.pdf`, `.md`, `.txt`).

Storage:
- Bucket: `documents` (private).
- Key: `uploads/{source_uid}/{original_filename}`

DB:
- `documents.source_locator` points at this key.
- This is load-bearing for future workflows where users must verify against the original (not just Markdown).

### B) Canonical Markdown artifact (always)

Definition:
- The Markdown bytes used as the canonical intermediate for **block splitting**.

Storage:
- For `.md` uploads: `md_locator == source_locator` (same object).
- For non-md uploads: `converted/{source_uid}/{basename}.md`

DB:
- `documents.md_locator` points at this key.
- `documents.md_uid = sha256(markdown_bytes)` must match the bytes at `md_locator`.

Why Markdown is the canonical pivot:
- We need a universal, deterministic textual substrate for block extraction.
- It is stable, diffable, and is the basis for `char_span` offsets.

### C) Docling structured artifact (currently optional; may become default later)

Definition (current implementation intent):
- Docling’s “default structured document export” (currently `document.export_to_dict()` serialized as JSON).

Storage:
- `converted/{source_uid}/{basename}.docling.json`

Status (directional):
- **Currently treated as a debug/QA artifact** to inspect conversion quality (tables, layout, provenance).
- Promotion to “default canonical artifact” requires explicit decisions:
  - Whether to track it in `documents` (e.g., `docling_locator`, `docling_uid`).
  - Whether Docling export failures are fatal or non-fatal when Markdown succeeded.
  - Whether `.md` uploads must also produce a Docling structured artifact.

---

## Identity Model (Content-Addressed Hashes)

All hashes are SHA-256 hex (64 lowercase hex chars).

```text
source_uid = sha256( source_type + "\n" + raw_source_bytes )
md_uid     = sha256( raw_markdown_bytes )
doc_uid    = sha256( immutable_schema_ref + "\n" + md_uid )
block_uid  = sha256( doc_uid + ":" + block_index )
```

Directional guarantees:
- `source_uid` identifies the uploaded blob bytes; the storage key is content-addressed.
- `md_uid` dedupes across formats if conversion yields identical Markdown bytes.
- `doc_uid` distinguishes “same Markdown under different immutable_schema_ref”.
- `block_uid` is deterministic given `doc_uid` and reading-order `block_index`.

---

## Block Extraction (Parser, AST, Offsets)

### Canonical splitter (locked for Phase 1/2)

We split blocks by parsing **Markdown → mdast (Markdown AST)** using:
- `remark-parse` (base)
- `remark-gfm` (tables, footnotes, etc.)

Directional reason this is locked now:
- The splitter runs in **Supabase Edge Functions (Deno)**.
- mdast provides node offsets (`position.start.offset`, `position.end.offset`) which back `blocks.char_span`.

### What `char_span` means (strict)

`char_span = [start, end]` are character offsets into the exact Markdown string stored at:
- `documents.md_locator`

If/when we add UI highlighting:
- The UI can show the exact slice `markdown.substring(start, end)` and/or scroll to it.

### Why we are *not* switching to Pandoc AST in-core (directional)

Pandoc AST can be a future parallel pipeline, but the core splitter stays mdast because:
- Pandoc is a native binary and does not run inside Supabase Edge Functions.
- Pandoc JSON AST does not reliably provide offsets equivalent to mdast node offsets for our `char_span` contract.

---

## Storage Setup (Directional)

### Buckets

- `documents` (private): stores all artifacts:
  - uploads (original bytes)
  - converted (derived Markdown)
  - optional structured debug artifacts (e.g., Docling JSON)

Directional note:
- We can add a second bucket later (e.g., `derived`), but **do not split buckets** until we need lifecycle policies or different access models.

### Canonical paths (locked)

```text
uploads/{source_uid}/{original_filename}
converted/{source_uid}/{basename}.md
converted/{source_uid}/{basename}.docling.json   (optional today)
```

---

## Database Contract (Directional, Stable)

This section is a human-readable summary; the migration files are the operational truth.

### Phase 1 tables

**documents**
- PK: `source_uid` (directional constraint: identical uploaded bytes are single-instance in Phase 1).
- `owner_id` controls read access via RLS.
- `md_uid`, `doc_uid` are unique when present.
- `immutable_schema_ref` is a **classification label** (does not change envelope shape).
- `status` is the lifecycle state (see below).

**blocks**
- PK: `block_uid` (hash)
- FK: `doc_uid → documents(doc_uid)` (on delete cascade)
- Unique: `(doc_uid, block_index)`
- Stores immutable columns only (no annotations in this table).

### Phase 2 tables

**schemas**
- User-defined annotation schemas.
- Stable identifiers:
  - `schema_ref` (slug)
  - `schema_uid` (sha256 of canonicalized schema JSON)

**annotation_runs**
- Binds `doc_uid + schema_id` to a run.
- Tracks progress counters.

**block_annotations**
- Overlay storage keyed by `(run_id, block_uid)`.
- Stores `annotation_jsonb` + per-block status.

Directional invariants:
- Blocks are never duplicated per schema; overlays reference immutable blocks.
- One document can have many runs, including multiple schemas and future model configs.

---

## Lifecycle State Machines (Directional)

### Document status (`documents.status`)

Canonical statuses:
- `uploaded` (md present and ready for ingest; or conversion-complete updated md_uid/doc_uid before block insert)
- `converting` (non-md: conversion requested; awaiting callback)
- `ingested` (blocks inserted; stable immutable substrate ready)
- `conversion_failed`
- `ingest_failed`

Directional behaviors:
- Idempotent ingest: re-uploading the same bytes returns existing status for that `source_uid`.
- A stale conversion cleanup marks long-running conversions as `conversion_failed` (TTL).

### Run status (`annotation_runs.status`)

Canonical statuses:
- `running`, `complete`, `failed`, `cancelled`

Directional behavior:
- “Worker protocol” is additive; Phase 2 currently supports creating runs + exporting overlays even before workers exist.

---

## Network/API Contracts (Directional)

### Edge Functions (public app surface)

- `POST /functions/v1/ingest` (multipart form: `file`, `immutable_schema_ref`, `doc_title`)
- `POST /functions/v1/schemas` (multipart form or JSON: uploads schema)
- `POST /functions/v1/runs` (JSON: `{ doc_uid, schema_id }`)
- `GET /functions/v1/export-jsonl?doc_uid=...`
- `GET /functions/v1/export-jsonl?run_id=...`

Directional rule:
- UI reads should prefer PostgREST table reads under RLS; mutations go through Edge Functions.

### Conversion callback contract (internal service boundary)

The conversion service must POST to the Edge Function callback endpoint:

```text
/functions/v1/conversion-complete
```

Directional rule:
- Callback URL should be explicit; do not infer a route that might drop `/functions/v1/`.
- Callback authentication uses a shared secret header `X-Conversion-Service-Key`.

---

## Deferred / Open Decisions (Must Be Explicit When Taken)

1) Promote Docling structured artifact from “optional debug” to “default artifact”.
2) If promoted: whether to add DB columns for it (`docling_locator`, `docling_uid`, timestamps).
3) Whether `.md` uploads must also produce Docling structured output (and how: same conversion service vs separate job).
4) Failure semantics: whether Docling JSON failure is fatal when Markdown succeeded.
5) Production hardening: gateway-level `verify_jwt` vs in-function auth only.

