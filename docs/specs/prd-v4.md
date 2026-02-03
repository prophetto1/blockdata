# PRODUCT REQUIREMENTS DOCUMENT (PRD) — Block Inventory + User-Defined Schemas + Annotation Pipeline version 4

Must define before anyone writes code:

Backend Architecture section (in PRD) — We discussed Supabase/Postgres, blocks as rows, JSONL as export, but the open questions are still hanging. This unblocks everything else. Those questions I asked you about file storage, run linkage, concurrency model, auth, versioning — we need to close those.

Database migration spec — Exact DDL. We drafted SQL but you correctly said "not ready." Once the backend architecture section is locked, this becomes mechanical.

API contract — What operations does the frontend call? Upload doc, trigger ingest, list blocks, export JSONL. (Phase 2 planned: create/select schema, start annotation run, get progress, export JSONL for a run.) Supabase gives you REST for free on tables, but the orchestration operations (ingest pipeline, conversion callbacks, and later annotation runs) need defined endpoints — likely Edge Functions.

Default immutable schema definition — The immutable envelope is universal; immutable_schema_ref is a classification label (e.g., md_prose_v1, law_case_v1). It does not require a database schemas table to begin Phase 1.

Annotation schema spec / example — What does a valid uploaded annotation schema look like? The Strunk 18 one is the first real use case — define its shape concretely and that becomes the reference for the validator.

Prompt template spec — The PRD says "annotator receives content.original + schema template + rules." The actual prompt structure needs to be written so the annotation worker can be built.

Can be defined in parallel with early dev:

Frontend component breakdown — PRD has the three pages (Upload, Schema Select, Run). A wireframe or component spec lets frontend work start while backend is being built.
Block splitter implementation spec — Which MD parser, how it maps to block types, edge case handling. Dev can start prototyping this against the PRD as-is, but a tighter spec avoids rework.

## Purpose

The product converts an uploaded document into a deterministic block inventory and then applies user-defined schemas ("lenses") to generate annotations per block. The goal is to support multiple use-cases with the same deterministic base (prose editing, legal-case signal extraction, metadata generation for knowledge bases/knowledge graphs), while keeping immutable source content fixed.

## Core Concepts

### Block

A "block" is one extracted unit in reading order (paragraph/equivalent section, and also headings/list items/code/tables as applicable). One JSON record is produced per extracted block.

### Deterministic vs User-Defined Portions

Each record has:

An immutable portion fixed after ingest (includes document-derived fields plus user/system metadata captured at upload).

An annotation portion shaped by a user-defined schema (changes as the AI fills results)

### Two Schema Types (different sources; different orientations)

Immutable schema (system-provided, classification label): the envelope structure is universal and identical regardless of document type. Every block record has the same immutable fields (envelope + content.original). The immutable_schema_ref (e.g., md_prose_v1, law_case_v1, kb_chunk_v1) is a classification label selected at upload that identifies the document type for downstream use. It does not change the envelope's shape or add fields to the immutable portion. All document-type-specific richness (citation counts, legal signals, rhetorical analysis, etc.) belongs in the annotation layer via swappable annotation schemas.

Annotation schema (user-defined, task/requirement-oriented): defines the output fields and structure the AI must fill for a chosen objective. Users upload or select annotation schemas based on their task. Examples:

- Strunk 18 rules schema: for prose editing, gathering edits to produce a revised document.
- Legal signal extraction schema: for SC cases, checking cited cases for positive/negative signals, flagging strong language, adding examiner notes—enriching analysis for retrieval.
- KB metadata schema: for knowledge base/graph generation.

## Canonical Record Format (One Block Record)

Each record is a JSON object with exactly two top-level keys: immutable and annotation.

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
      "block_index": 37,
      "section_path": ["…"],
      "char_span": [0, 0]
    },
    "content": { "original": "…" }
  },
  "annotation": {
    "schema_ref": null,
    "data": {}
  }
}
```

## Field Reference (In JSON Order)

| L1         | L2       | Field                | Meaning                                                                                             |
| ---------- | -------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| immutable  |          | immutable_schema_ref | Which immutable record-kind is being used for this ingest (e.g., prose vs law-case vs KB metadata). |
| immutable  | envelope | doc_uid              | Document identifier. SHA256(immutable_schema_ref + "\n" + md_uid). Blocks FK to this.               |
| immutable  | envelope | source_uid           | Identity of the uploaded source blob. SHA256(source_type + "\n" + raw_source_bytes).                |
| immutable  | envelope | md_uid               | Identity of the Markdown bytes used for ingest. SHA256(raw_markdown_bytes).                         |
| immutable  | envelope | source_type          | Original upload format (md, docx, pdf, txt).                                                        |
| immutable  | envelope | source_locator       | Storage path for the original uploaded file.                                                        |
| immutable  | envelope | md_locator           | Storage path for the Markdown used for ingest. Same as source_locator for .md uploads.              |
| immutable  | envelope | doc_title            | Auto-extracted from first H1 heading, user-editable.                                                |
| immutable  | envelope | uploaded_at          | Upload timestamp.                                                                                   |
| immutable  | envelope | block_uid            | Block identifier within the document. SHA256(doc_uid + ":" + block_index).                          |
| immutable  | envelope | block_type           | Block kind (paragraph/heading/etc.).                                                                |
| immutable  | envelope | block_index          | Block position in reading order.                                                                    |
| immutable  | envelope | section_path         | Heading stack location of the block.                                                                |
| immutable  | envelope | char_span            | Character offsets into the stored Markdown string (md_locator target).                              |
| immutable  | content  | original             | The extracted block text (the paragraph itself lives here).                                         |
| annotation |          | schema_ref           | Reserved for Phase 2. In Phase 1, this is NULL (or empty string) and is not used.                   |
| annotation |          | data                 | Reserved for Phase 2. In Phase 1, this is always {}.                                                |

## Identity Model (Three Hashes)

Three content-addressed hashes identify different things:

**source_uid** = SHA256(source_type + "\n" + raw_source_bytes). Identity of the uploaded source blob (docx, pdf, md, etc.). Always computable at upload time. Used for: conversion job tracking, callbacks, storage paths, lifecycle status.

**md_uid** = SHA256(raw_markdown_bytes). Identity of the Markdown bytes that will be ingested. For .md uploads, raw_markdown_bytes = raw_source_bytes (so md_uid is computable immediately). For non-MD uploads, md_uid is computed after conversion completes. Used for: deduplication across formats (a converted .docx and a directly-uploaded .md that produce identical Markdown yield the same md_uid).

**doc_uid** = SHA256(immutable_schema_ref + "\n" + md_uid). Identity of a document under an immutable schema. Same Markdown under different immutable_schema_ref = different doc_uid. This is the FK target for blocks. Used for: block identity, all downstream operations. For .md uploads, doc_uid is computable immediately. For non-MD uploads, doc_uid is computed after conversion (because md_uid is needed first).

**block_uid** = SHA256(doc_uid + ":" + block_index). Deterministic, idempotent. Same document re-ingested under the same schema produces the same block UIDs.

### Identity Behavior by Upload Type

For .md uploads: source_uid, md_uid, and doc_uid are all computable in a single request. The documents row is fully populated at upload time. Ingest (remark-parse → blocks) proceeds immediately.

For non-MD uploads: source_uid is computed at upload. The documents row is created with status='converting', md_uid=NULL, doc_uid=NULL. After conversion completes and Markdown is written to Storage, the callback computes md_uid and doc_uid, updates the documents row, and proceeds to ingest.

No UUID4 for content-addressed identifiers (determinism is required). conversion_job_id uses UUID4 (not content-addressed).

### Definitions (Glossary)

source_uid = identity of the uploaded blob (docx/pdf/md/etc.). Exists at upload time. Row primary key.

md_uid = identity of the Markdown bytes used for parsing. Exists once Markdown exists (immediate for .md, after conversion otherwise).

doc_uid = identity of the ingested document under an immutable schema. Exists only when md_uid exists. This is what blocks attach to.

### Invariants

**One upload → one immutable schema → one document.** Each upload (source_uid) produces exactly one document (doc_uid) under exactly one immutable_schema_ref. Re-ingesting the same source under a different immutable schema requires a new upload.

**doc_uid is never source identity.** The table's primary key is always source_uid. doc_uid is never used to locate the row during upload or conversion. doc_uid is only assigned by the ingest step, derived as sha256(immutable_schema_ref + "\n" + md_uid). Once set, doc_uid is immutable (never changes).

**NULL dependency chain.** doc_uid cannot exist without md_uid. md_locator cannot exist without md_uid. Enforced via CHECK constraints: (doc_uid IS NULL OR md_uid IS NOT NULL) and (md_locator IS NULL OR md_uid IS NOT NULL).

**Ingest idempotency.** If doc_uid is already set and status='ingested', the callback is a no-op. No double-ingest.

### API Contract Split

Upload and conversion endpoints use source_uid to locate the documents row. Conversion callbacks include both source_uid and conversion_job_id.

Block endpoints use doc_uid. Phase 1 uses this for block inventory preview (list blocks) and JSONL export.

## Immutability Rule (Hard Requirement)

After ingest is complete, nothing under immutable may be modified. In Phase 1, annotation is an inert placeholder: annotation.schema_ref is NULL (or empty string) and annotation.data is {}.

## Ingestion Pipeline (Document → Block Inventory)

### Accepted Formats

The pipeline accepts: .md, .docx, .pdf, .txt. Markdown files are ingested directly. All other formats are converted to Markdown via Docling before ingest.

### Docling Integration (Format Conversion)

Docling (IBM, MIT license) runs as a separate Python microservice (FastAPI). It is a stateless file converter: files go in, Markdown comes out. Docling is part of the integrated pipeline, not an external tool users run separately.

**Architectural boundary:** The Python microservice touches Supabase Storage only. It never reads from or writes to the Postgres database. All database operations (inserts, updates, status changes) are performed by Edge Functions.

**Auth:** The Python service authenticates via a shared secret environment variable. Edge Functions generate signed Storage URLs so the Python service needs no Supabase keys.

**Conversion flow:**

1. Edge Function receives upload, writes source file to Supabase Storage.
2. Edge Function computes source_uid, generates a conversion_job_id (UUID4), creates the documents row with status='converting', md_uid=NULL, doc_uid=NULL, conversion_job_id set. Row is committed before calling Python service (prevents race condition).
3. Edge Function calls Python service with signed Storage URL for the source file, source_uid, and conversion_job_id as callback references.
4. Python service downloads source file via signed URL, runs Docling conversion, writes resulting .md back to Storage, hits callback Edge Function with source_uid + conversion_job_id + md storage path.
5. Callback Edge Function verifies conversion_job_id matches the current value on the documents row (rejects stale callbacks). Reads .md from Storage, computes md_uid and doc_uid, updates the documents row (md_uid, doc_uid, md_locator). If doc_uid is already set and status='ingested', callback is a no-op (ingest idempotency).
6. Callback Edge Function runs remark-parse on the Markdown, extracts blocks, writes block rows. Sets status='ingested'.

For .md uploads, steps 2-5 collapse: source file is the Markdown, all three hashes are computed immediately, no Python service call needed.

### Timeout and Failure Handling

**Request timeout:** Edge Function sets a request timeout (configurable, e.g., 60s) when calling the Python service. If the call times out, the Edge Function treats the conversion outcome as unknown and leaves status='converting'. Resolution happens via the callback Edge Function (preferred) or the stale conversion cleanup TTL.

**Stale conversion cleanup (required):** A scheduled job (pg_cron) runs periodically to mark conversions that never complete (no callback observed within TTL):

```sql
UPDATE documents
SET status = 'conversion_failed',
    error = 'conversion timed out (stale)'
WHERE status = 'converting'
  AND uploaded_at < now() - INTERVAL '5 minutes';
```

**Conversion errors:** If Docling returns an error, the callback Edge Function sets status='conversion_failed' and writes the error message to the error column.

**Ingest errors:** If remark-parse or block writing fails after successful conversion, status is set to 'ingest_failed' with the error message.

### Inputs

Document upload (.md, .docx, .pdf, .txt)

doc_title (user input)

immutable_schema_ref (user selection from system-provided immutable schemas)

### Output

Block rows in the database (one row per block, in reading order). Each row has immutable columns populated (including content_original). In Phase 1, annotation columns remain inert placeholders.

JSONL is an export format generated on demand from these rows. The database is the source of truth.

### Behavior Requirements

The paragraph text is stored inside each block row at content_original (not elsewhere).

The block identity/location fields (block_uid, block_index, block_type, section_path, char_span) refer to the same paragraph stored in content_original.

## Ingestion Implementation Details

### Block Splitting Logic (MD → Blocks)

Blocks are produced in a single reading-order pass over the Markdown source using remark-parse (unified/remark ecosystem). The parser produces an mdast (Markdown Abstract Syntax Tree) where every node exposes position.start.offset and position.end.offset (providing char_span), a type field (providing block_type), and tree structure (providing section_path via heading nesting).

Block types: any discrete unit supported by the Markdown format (heading, paragraph, list_item, code, table, blockquote, hr, etc.). The system does not control what block types appear in a document; it extracts whatever the Markdown format defines as a block-level element.

Lists: N blocks (one per list item), including nested items (each nested item is its own list_item block). No extra nesting fields in v0; nesting is implied by reading order only.

### doc_title Auto-Extraction

Default doc_title is extracted deterministically: first H1 heading (depth === 1) found in the AST. If no H1 exists, fallback is the filename minus extension. The extracted title is presented to the user as an editable field before ingest confirmation.

### char_span Offset Tracking

char_span is [start, end] character offsets into the stored Markdown string (the file at md_locator). Half-open is fine as long as consistent.

Ingest must track offsets during extraction (either via a parser that exposes source positions or via a deterministic scanner that records start/end as it emits blocks). Placeholders are not allowed.

### source_locator and md_locator

source_locator is the storage path for the original uploaded file, e.g. uploads/{source_uid}/{original_filename}.docx. Assigned by the upload/storage subsystem.

md_locator is the storage path for the Markdown used for ingest. For .md uploads, md_locator = source_locator. For non-MD uploads, md_locator points to the Docling conversion output, e.g. converted/{source_uid}/{original_filename}.md.

### Schema Validation ("Schema of Schemas")

v0 validation is simple and explicit: when a user uploads a schema artifact, the system checks it is valid JSON and contains the required top-level keys/types for that schema artifact format.

No "schema-of-schemas" is required in v0; it's just a hard validator function in code that rejects malformed schema uploads.

### section_path Edge Cases

If the document has no headings: section_path = [] for every block.

If content appears before the first heading: [] until the first heading is encountered.

## Annotation Pipeline (Block Inventory → Annotated Output)

Phase 2 is out of scope for this build. Phase 1 keeps annotation inert:

- In JSONL export: annotation.schema_ref is NULL (or empty string) and annotation.data is {}.
- In Postgres (Phase 1): blocks are immutable-only (no per-block annotation storage).
- In Postgres (Phase 2 planned): annotations live in a separate table keyed by (run_id, block_uid), so the same block can be annotated under multiple schemas without overwriting.

## Error States (Ingest/Annotation)

Ingest: write block rows atomically (transaction). If ingest fails, no partial blocks are committed. documents.status is set to 'ingest_failed' with error message.

Annotation error states are out of scope for Phase 1.

## Backend Architecture (Supabase / PostgreSQL)

### Storage Model

The canonical JSON record (immutable + annotation) is the export format, not the storage format. In the database, each block is a row. Immutable envelope fields are fixed Postgres columns (queryable, indexable). Annotation data is stored as JSONB (shape varies per user-defined schema) in a separate per-run table (Phase 2).

JSONL is generated on demand from the database at export time. The database is the source of truth.

### Why JSONB for Annotation

Annotation schemas are user-defined — the field structure changes per schema. JSONB stores this as a pre-parsed binary format that supports indexing, querying (annotation_jsonb->>'field_name'), and containment checks without re-parsing. Per-block annotation outputs are stored as JSONB in `block_annotations` (Phase 2), never as a JSON text column.

### Service Architecture

**Edge Functions (Deno/TypeScript):** Own all database operations. Handle upload orchestration, conversion callback handling, ingest (remark-parse), JSONL export. (Phase 2 planned: schema binding and annotation execution.) Run server-side with the Supabase service role key.

**Python Microservice (FastAPI):** Runs Docling for format conversion and Pandoc for document reconstruction (Phase 2+). Stateless — accepts a signed Storage URL, performs conversion, writes output to Storage, calls back to Edge Function. Authenticates via shared secret environment variable. Never touches Postgres.

**Supabase Storage:** Holds uploaded source files and converted Markdown files. Python service accesses via signed URLs generated by Edge Functions.

**Deployment:** Edge Functions on Supabase. Python microservice on Railway/Fly.io/VPS (separate container). SvelteKit frontend as a static dashboard site (host anywhere).

### Auth and RLS

**Writes:** Edge Functions only, using the service role key. The service role key is never exposed to the client. The Python microservice authenticates to Edge Function callbacks via shared secret — it never writes to Postgres directly.

**Reads:** Authenticated user JWT with RLS policies. RLS checks `documents.owner_id = auth.uid()` so users only read their own documents. Blocks derive ownership via the join to documents (no `owner_id` column on blocks).

**No client-side inserts or updates ever.** All mutations flow through Edge Functions.

### Table Design

**documents** — one row per uploaded document

| Column               | Type        | Source / Notes                                                                                                                 |
| -------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| owner_id             | UUID        | Owner for RLS (`auth.uid()`). Required.                                                                                        |
| source_uid           | TEXT PK     | SHA256(source_type + "\n" + raw_source_bytes). Always populated at upload. Row anchor.                                         |
| md_uid               | TEXT UNIQUE | SHA256(raw_markdown_bytes). NULL until Markdown exists.                                                                        |
| doc_uid              | TEXT UNIQUE | SHA256(immutable_schema_ref + "\n" + md_uid). NULL until Markdown exists. Block FK target.                                     |
| source_type          | TEXT        | Original upload format: md, docx, pdf, txt.                                                                                    |
| source_locator       | TEXT        | Storage path for original uploaded file.                                                                                       |
| md_locator           | TEXT        | Storage path for Markdown used for ingest. Same as source_locator for .md uploads. NULL until conversion completes for non-MD. |
| doc_title            | TEXT        | Auto-extracted from first H1 heading, user-editable.                                                                           |
| uploaded_at          | TIMESTAMPTZ | Upload timestamp.                                                                                                              |
| updated_at           | TIMESTAMPTZ | Updated on status/error transitions. Required.                                                                                 |
| immutable_schema_ref | TEXT        | Classification label (e.g. md_prose_v1, law_case_v1).                                                                          |
| conversion_job_id    | UUID        | UUID4. Set when conversion starts. Callbacks must match this to be accepted. NULL for .md uploads (no conversion).             |
| status               | TEXT        | uploaded / converting / ingested / conversion_failed / ingest_failed.                                                          |
| error                | TEXT        | NULL when healthy. Human-readable error message on failure.                                                                    |

CHECK constraints: source_uid matches 64-character hex. md_uid matches 64-character hex when NOT NULL. doc_uid matches 64-character hex when NOT NULL. source_type IN ('md', 'docx', 'pdf', 'txt'). status IN ('uploaded', 'converting', 'ingested', 'conversion_failed', 'ingest_failed'). NULL dependency: (doc_uid IS NULL OR md_uid IS NOT NULL). NULL dependency: (md_locator IS NULL OR md_uid IS NOT NULL).

PK design: source_uid is the primary key — always computable at upload, never NULL, never changes. doc_uid is a UNIQUE nullable column that blocks FK to. For .md uploads, all three hashes populate on insert (conversion_job_id stays NULL). For non-MD uploads, md_uid and doc_uid start NULL and are set after conversion completes. source_uid is the row anchor (lifecycle tracking, callbacks, storage paths); doc_uid is the block anchor (all downstream operations FK here).

`updated_at` is maintained by a trigger on UPDATE.

Schema upload/binding and annotation execution are out of scope for Phase 1. Phase 2 adds `schemas` (user-defined annotation schemas), `annotation_runs` (one run per doc+schema), and `block_annotations` (one row per block per run).

**blocks** — one row per block, core working table

| Column           | Type      | Source / Notes                                       |
| ---------------- | --------- | ---------------------------------------------------- |
| block_uid        | TEXT PK   | SHA256(doc_uid + ":" + block_index).                 |
| doc_uid          | TEXT FK   | → documents.doc_uid. ON DELETE CASCADE.              |
| block_index      | INTEGER   | Position in reading order (0-based).                 |
| block_type       | TEXT      | paragraph, heading, list_item, code, table, etc.     |
| section_path     | TEXT[]    | Heading stack location.                              |
| char_span        | INTEGER[] | [start, end] character offsets into stored Markdown. |
| content_original | TEXT      | The extracted block text.                            |

Constraints: UNIQUE (doc_uid, block_index). block_uid matches 64-character hex. block_index >= 0. char_span elements are nonnegative and start <= end.

Indexes: blocks(doc_uid), blocks(doc_uid, block_index), documents(uploaded_at DESC).

**schemas** (Phase 2) — one row per user-defined annotation schema (reusable across many documents/runs)

| Column       | Type        | Purpose                                                             |
| ------------ | ----------- | ------------------------------------------------------------------- |
| schema_ref   | TEXT PK     | Stable identifier (e.g., strunk_18, legal_signals_v1).              |
| schema_jsonb | JSONB       | Template/contract for annotation outputs (shape is schema-defined). |
| created_at   | TIMESTAMPTZ | Creation timestamp                                                  |

**annotation_runs** (Phase 2) — one row per annotation execution run

| Column           | Type        | Purpose                                                    |
| ---------------- | ----------- | ---------------------------------------------------------- |
| run_id           | UUID PK     | UUID4 (runs are not content-addressed).                    |
| doc_uid          | TEXT FK     | → documents.doc_uid.                                       |
| schema_ref       | TEXT FK     | → schemas.schema_ref.                                      |
| status           | TEXT        | running / complete / failed / cancelled.                   |
| total_blocks     | INTEGER     | Total blocks in document. Required for progress.           |
| completed_blocks | INTEGER     | Successfully annotated (default 0). Required for progress. |
| failed_blocks    | INTEGER     | Failed annotation (default 0). Required for run health.    |
| started_at       | TIMESTAMPTZ | Run start time.                                            |
| completed_at     | TIMESTAMPTZ | Run completion time.                                       |
| failure_log      | JSONB       | Array of failed block_uids with error details. Required.   |

CHECK constraints: status IN ('running', 'complete', 'failed', 'cancelled').

**block_annotations** (Phase 2) — one row per block per run (enables multi-schema per document)

| Column           | Type        | Purpose                                                   |
| ---------------- | ----------- | --------------------------------------------------------- |
| run_id           | UUID FK     | → annotation_runs.run_id.                                 |
| block_uid        | TEXT FK     | → blocks.block_uid.                                       |
| annotation_jsonb | JSONB       | Annotation output for this block under this run's schema. |
| status           | TEXT        | pending / claimed / complete / failed.                    |
| claimed_by       | TEXT        | Worker identifier.                                        |
| claimed_at       | TIMESTAMPTZ | When worker claimed the block.                            |
| attempt_count    | INTEGER     | Number of attempts (default 0).                           |
| last_error       | TEXT        | Error message from most recent failure.                   |

Primary key: (run_id, block_uid)

### How Immutable Maps to Storage

Document-level envelope fields (doc_uid, source_uid, md_uid, source_type, source_locator, md_locator, doc_title, uploaded_at, immutable_schema_ref) are stored once on the documents table. Block-level envelope fields (block_uid, block_index, block_type, section_path, char_span) and content.original are stored as fixed columns on the blocks table. No JSONB on the immutable side — the shape is universal and never changes.

### How Annotation Maps to Storage

Phase 1 keeps annotation inert (no per-block annotation storage).

Phase 2 stores annotations per run in `block_annotations` keyed by (run_id, block_uid). This supports annotating the same document under multiple schemas without overwriting or duplicating immutable block data.

### Concurrent Annotation Pattern (Phase 2)

Workers claim block annotations atomically using FOR UPDATE SKIP LOCKED, ordered by the immutable block_index:

```sql
WITH candidate AS (
  SELECT ba.run_id, ba.block_uid
  FROM block_annotations ba
  JOIN blocks b ON b.block_uid = ba.block_uid
  WHERE ba.run_id = $run_id AND ba.status = 'pending'
  ORDER BY b.block_index
  FOR UPDATE OF ba SKIP LOCKED
  LIMIT 1
)
UPDATE block_annotations ba
SET status = 'claimed', claimed_by = $worker, claimed_at = now()
FROM candidate c
WHERE ba.run_id = c.run_id AND ba.block_uid = c.block_uid
RETURNING ba.*
```

Each worker reads content_original, calls the LLM, writes annotation_jsonb, and sets status to complete/failed.

The frontend subscribes to block_annotations status changes (scoped to a run_id) via Supabase Realtime for live progress display.

### JSONL Export

JSONL is assembled on demand by querying blocks joined to documents, ordered by block_index.

- Phase 1 export: annotation is the inert placeholder (schema_ref NULL/empty; data {}).
- Phase 2 export: export is parameterized by run_id (or by doc_uid+schema_ref mapped to a run). annotation.data is taken from block_annotations.annotation_jsonb for that run.

Export does not modify the database.

### Export Branches

The same annotated block rows support multiple export paths:

- **JSONL file** — portable artifact for archival, sharing, or downstream pipelines
- **Document reconstruction** — extract updated content across blocks in order → assemble into .md → Pandoc → .docx / .pdf / .html
- **Knowledge graph ingest** — extract entities, relations, triples from block_annotations.annotation_jsonb for a run → push to graph database
- **Vector indexing** — embed content_original per block with metadata from both columns and block_annotations.annotation_jsonb for filtered semantic search

All export paths reference the same block_uid as the universal join key.

## Example Use-Cases Supported by Swappable Schemas

### Prose / Paper / Essay (Strunk-style lens)

Immutable schema: prose ingest (md_prose_v1) produces blocks with paragraph text and navigation fields.

Annotation schema: Strunk rules schema with fields such as rule hits and (optionally) rewrite_candidate.

### Supreme Court / CAP / Law Cases (signal extraction lens)

Immutable schema: law_case_v1 classification label applied at upload. Same universal envelope; no additional immutable fields. Annotation schema defines outputs for legal objectives (signals, holdings, citations, etc.).

### KB / Knowledge Graph metadata generation

Immutable schema: kb_chunk_v1 classification label applied at upload. Same universal envelope; no additional immutable fields. Annotation schema defines extracted metadata fields used downstream.

## Frontend Requirements (Phase 1)

### Upload Document Page

Must allow:

Upload document file (.md, .docx, .pdf, .txt)

Enter doc_title (auto-extracted from first H1 heading or filename, user-editable)

Select immutable schema from system-provided options (immutable_schema_ref)

Must show:

Upload progress and conversion status (for non-MD files)

A preview that confirms blocks were created (block_index, block_type, section_path, snippet of content_original)

Error state with human-readable message if conversion or ingest fails

### Select Annotation Schema Page (Phase 2)

Out of scope for Phase 1.

Must allow:

Select/upload annotation schema (schema_ref)

Must show:

The annotation template fields that will appear under annotation.data (read-only preview)

### Run Annotation Page (Phase 2)

Out of scope for Phase 1.

Must show:

Progress across blocks (via Supabase Realtime)

Per-block view combining:

content_original

annotation_jsonb outputs

## Spec Writing Requirements (Process Requirement)

All future spec text and explanations must:

Show the JSON shape first

Explain fields strictly in the same order as the JSON

Avoid introducing new mechanisms or alternate designs midstream

## build out requirements

• For Phase 1 (immutable end-to-end), you need these build items:

- DDL migrations: documents + blocks (immutable-only), indexes,
  constraints, status/error fields, conversion_job_id
- Storage buckets + path conventions: original uploads + converted
  markdown
- Edge Functions (Deno/TS):
  - POST /ingest (handles .md directly; for non-md: create row → set
    converting → call Python service)
  - POST /conversion-complete (validate source_uid +
    conversion_job_id, read .md, compute md_uid + doc_uid, write
    blocks, set ingested / ingest_failed)
  - GET /documents/:source_uid (status + doc_uid once available) and
    GET /documents/:doc_uid/blocks (inventory) or equivalent
  - GET /export (Phase 1: emits inert annotation placeholder)
- Python microservice (FastAPI):
  - POST /convert (Docling converts .docx/.pdf/.txt → .md and writes
    back to Storage; callback to /conversion-complete)
  - Shared-secret auth (CONVERSION_SERVICE_KEY), storage-only boundary
    (signed URLs), timeouts/retries
- SvelteKit (minimal UI):
  - Upload page (file + immutable_schema_ref + doc_title)
  - Status/progress page (poll documents.status)
  - Block preview page (list blocks)
  - Export button (downloads JSONL)

For Phase 2 (multi-schema annotation), you later add:

- DDL: schemas, annotation_runs, block_annotations
- Edge Functions: create schema, start run (populate block_annotations),
  claim/complete, export by run_id
- Realtime subscriptions on block_annotations updates
- Worker service loop (claim → LLM → complete)
