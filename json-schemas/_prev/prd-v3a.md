# PRODUCT REQUIREMENTS DOCUMENT (PRD) — Block Inventory + User-Defined Schemas + Annotation Pipeline version 3

Must define before anyone writes code:

Backend Architecture section (in PRD) — We discussed Supabase/Postgres, blocks as rows, JSONL as export, but the open questions are still hanging. This unblocks everything else. Those questions I asked you about file storage, run linkage, concurrency model, auth, versioning — we need to close those.

Database migration spec — Exact DDL. We drafted SQL but you correctly said "not ready." Once the backend architecture section is locked, this becomes mechanical.

API contract — What operations does the frontend call? Upload doc, trigger ingest, list blocks, select schema, start annotation run, get progress, export JSONL. Supabase gives you REST for free on tables, but the orchestration operations (ingest pipeline, annotation dispatch) need defined endpoints — likely Edge Functions.

Default immutable schema definition — What does md_prose_v1 actually look like as a concrete JSON artifact in the schemas table? Devs need this to build ingest.

Annotation schema spec / example — What does a valid uploaded annotation schema look like? The Strunk 18 one is the first real use case — define its shape concretely and that becomes the reference for the validator.

Prompt template spec — The PRD says "annotator receives content.original + schema template + rules." The actual prompt structure needs to be written so the annotation worker can be built.

Can be defined in parallel with early dev:

Frontend component breakdown — PRD has the three pages (Upload, Schema Select, Run). A wireframe or component spec lets frontend work start while backend is being built.
Block splitter implementation spec — Which MD parser, how it maps to block types, edge case handling. Dev can start prototyping this against the PRD as-is, but a tighter spec avoids rework.

## Purpose

The product converts an uploaded document into a deterministic block inventory and then applies a user-defined schema ("lens") to generate annotations per block. The goal is to support multiple use-cases with the same deterministic base (prose editing, legal-case signal extraction, metadata generation for knowledge bases/knowledge graphs), while keeping immutable source content fixed.

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
    "schema_ref": "strunk_18",
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
| immutable  | envelope | source_type          | Original upload format (md, docx, pdf, pptx, txt).                                                  |
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
| annotation |          | schema_ref           | The user-defined annotation schema (lens) being applied.                                            |
| annotation |          | data                 | Schema-defined output area; this is what the AI fills.                                              |

## Identity Model (Three Hashes)

Three content-addressed hashes identify different things:

**source_uid** = SHA256(source_type + "\n" + raw_source_bytes). Identity of the uploaded source blob (docx, pdf, md, etc.). Always computable at upload time. Used for: conversion job tracking, callbacks, storage paths, lifecycle status.

**md_uid** = SHA256(raw_markdown_bytes). Identity of the Markdown bytes that will be ingested. For .md uploads, raw_markdown_bytes = raw_source_bytes (so md_uid is computable immediately). For non-MD uploads, md_uid is computed after conversion completes. Used for: deduplication across formats (a converted .docx and a directly-uploaded .md that produce identical Markdown yield the same md_uid).

**doc_uid** = SHA256(immutable_schema_ref + "\n" + md_uid). Identity of a document under an immutable schema. Same Markdown under different immutable_schema_ref = different doc_uid. This is the FK target for blocks. Used for: block identity, all downstream operations. For .md uploads, doc_uid is computable immediately. For non-MD uploads, doc_uid is computed after conversion (because md_uid is needed first).

**block_uid** = SHA256(doc_uid + ":" + block_index). Deterministic, idempotent. Same document re-ingested under the same schema produces the same block UIDs.

### Identity Behavior by Upload Type

For .md uploads: source_uid, md_uid, and doc_uid are all computable in a single request. The documents row is fully populated at upload time. Ingest (remark-parse → blocks) proceeds immediately.

For non-MD uploads: source_uid is computed at upload. The documents row is created with status='converting', md_uid=NULL, doc_uid=NULL. After conversion completes and Markdown is written to Storage, the callback computes md_uid and doc_uid, updates the documents row, and proceeds to ingest.

No UUID4 for content-addressed identifiers (determinism is required). annotation_runs.run_id uses UUID4 (runs are not content-addressed).

## Immutability Rule (Hard Requirement)

After ingest is complete, nothing under immutable may be modified. During annotation, annotation.schema_ref is set during schema binding (before AI execution begins); the AI fills only annotation.data.

## Ingestion Pipeline (Document → Block Inventory)

### Accepted Formats

The pipeline accepts: .md, .docx, .pdf, .pptx, .txt. Markdown files are ingested directly. All other formats are converted to Markdown via Docling before ingest.

### Docling Integration (Format Conversion)

Docling (IBM, MIT license) runs as a separate Python microservice (FastAPI). It is a stateless file converter: files go in, Markdown comes out. Docling is part of the integrated pipeline, not an external tool users run separately.

**Architectural boundary:** The Python microservice touches Supabase Storage only. It never reads from or writes to the Postgres database. All database operations (inserts, updates, status changes) are performed by Edge Functions.

**Auth:** The Python service authenticates via a shared secret environment variable. Edge Functions generate signed Storage URLs so the Python service needs no Supabase keys.

**Conversion flow:**

1. Edge Function receives upload, writes source file to Supabase Storage.
2. Edge Function computes source_uid, creates the documents row with status='converting', md_uid=NULL, doc_uid=NULL. Row is committed before calling Python service (prevents race condition).
3. Edge Function calls Python service with signed Storage URL for the source file and the source_uid as callback reference.
4. Python service downloads source file via signed URL, runs Docling conversion, writes resulting .md back to Storage, hits callback Edge Function with source_uid + md storage path.
5. Callback Edge Function reads .md from Storage, computes md_uid and doc_uid, updates the documents row (md_uid, doc_uid, md_locator, status='ingested' or proceeds to ingest step).
6. Callback Edge Function runs remark-parse on the Markdown, extracts blocks, writes block rows. Sets status='ingested'.

For .md uploads, steps 2-5 collapse: source file is the Markdown, all three hashes are computed immediately, no Python service call needed.

### Timeout and Failure Handling

**Request timeout:** Edge Function sets a request timeout (configurable, e.g., 60s) when calling the Python service. If the call times out, the Edge Function sets status='conversion_failed' and error='conversion timeout' on the documents row immediately.

**Stale conversion cleanup:** A scheduled job (pg_cron) runs periodically to catch the edge case where the Edge Function itself crashes after calling the Python service but before handling the timeout:

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

Document upload (.md, .docx, .pdf, .pptx, .txt)

doc_title (user input)

immutable_schema_ref (user selection from system-provided immutable schemas)

### Output

Block rows in the database (one row per block, in reading order). Each row has immutable columns populated (including content_original). Annotation columns are empty until schema binding.

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

Inputs:

Block rows in database (produced by ingest)

annotation schema selection/upload (schema_ref)

Behavior:

annotation_schema_ref is set from user selection; it is not derived from document text.

annotation_jsonb is initialized to the template/shape defined by the chosen schema.

The AI reads each block and fills only annotation_jsonb according to the schema.

Output:

Updated block rows where annotation_jsonb is filled for successfully annotated blocks; failed blocks retain the initialized template. JSONL export is generated on demand.

### AI Annotation Execution (v0)

v0 is model/provider-agnostic: "LLM model" is a config value, not hardcoded in the PRD.

Prompt construction: the annotator receives (a) content_original, (b) the chosen schema template for annotation_jsonb, and (c) strict rule: do not modify immutable; fill only annotation_jsonb.

Execution: sync block-by-block in v0, with retry-on-failure per block.

Failures do not change immutable; failed blocks keep their annotation template unchanged, and failures are recorded in the annotation_runs failure_log and per-block last_error.

## Error States (Ingest/Annotation)

Ingest: write block rows atomically (transaction). If ingest fails, no partial blocks are committed. documents.status is set to 'ingest_failed' with error message.

Annotation: if block 37/200 fails, continue; all 200 block rows remain, with completed blocks having filled annotation_jsonb and failed blocks retaining the initialized template. annotation_runs tracks completed_blocks and failed_blocks counts; failure_log records failed block_uids with error details.

## Backend Architecture (Supabase / PostgreSQL)

### Storage Model

The canonical JSON record (immutable + annotation) is the export format, not the storage format. In the database, each block is a row. Immutable envelope fields are fixed Postgres columns (queryable, indexable). Annotation data is stored as JSONB (shape varies per user-defined schema).

JSONL is generated on demand from the database at export time. The database is the source of truth.

### Why JSONB for Annotation

Annotation schemas are user-defined — the field structure changes per schema. JSONB stores this as a pre-parsed binary format that supports indexing, querying (annotation_jsonb->>'field_name'), and containment checks without re-parsing. All annotation columns use JSONB, never JSON.

### Service Architecture

**Edge Functions (Deno/TypeScript):** Own all database operations. Handle upload orchestration, ingest (remark-parse), schema binding, annotation dispatch, JSONL export. Run server-side with the Supabase service role key.

**Python Microservice (FastAPI):** Runs Docling for format conversion and Pandoc for document reconstruction (Phase 2+). Stateless — accepts a signed Storage URL, performs conversion, writes output to Storage, calls back to Edge Function. Authenticates via shared secret environment variable. Never touches Postgres.

**Supabase Storage:** Holds uploaded source files and converted Markdown files. Python service accesses via signed URLs generated by Edge Functions.

**Deployment:** Edge Functions on Supabase. Python microservice on Railway/Fly.io/VPS (separate container). Next.js frontend on Vercel.

### Auth and RLS

**Writes:** Edge Functions only, using the service role key. The service role key is never exposed to the client. The Python microservice authenticates to Edge Function callbacks via shared secret — it never writes to Postgres directly.

**Reads:** Authenticated user JWT with RLS policies. RLS checks owner_id (or equivalent) so users only read their own documents and blocks. The anon key is not used for reads in production; user authentication is required.

**No client-side inserts or updates ever.** All mutations flow through Edge Functions.

### Table Design

**documents** — one row per uploaded document

| Column               | Type        | Source / Notes                                                                                                                 |
| -------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| source_uid           | TEXT        | SHA256(source_type + "\n" + raw_source_bytes). UNIQUE. Always populated at upload.                                             |
| md_uid               | TEXT        | SHA256(raw_markdown_bytes). NULL until Markdown exists. UNIQUE when NOT NULL.                                                  |
| doc_uid              | TEXT PK     | SHA256(immutable_schema_ref + "\n" + md_uid). NULL until Markdown exists. Set as PK once computed.                             |
| source_type          | TEXT        | Original upload format: md, docx, pdf, pptx, txt.                                                                              |
| source_locator       | TEXT        | Storage path for original uploaded file.                                                                                       |
| md_locator           | TEXT        | Storage path for Markdown used for ingest. Same as source_locator for .md uploads. NULL until conversion completes for non-MD. |
| doc_title            | TEXT        | Auto-extracted from first H1 heading, user-editable.                                                                           |
| uploaded_at          | TIMESTAMPTZ | Upload timestamp.                                                                                                              |
| immutable_schema_ref | TEXT        | Classification label (e.g. md_prose_v1, law_case_v1).                                                                          |
| status               | TEXT        | uploaded / converting / ingested / conversion_failed / ingest_failed.                                                          |
| error                | TEXT        | NULL when healthy. Human-readable error message on failure.                                                                    |

CHECK constraints: source_uid matches 64-character hex. md_uid matches 64-character hex when NOT NULL. doc_uid matches 64-character hex when NOT NULL. source_type IN ('md', 'docx', 'pdf', 'pptx', 'txt'). status IN ('uploaded', 'converting', 'ingested', 'conversion_failed', 'ingest_failed').

Note on PK: doc_uid is the primary key and FK target for blocks. For .md uploads it is computed immediately. For non-MD uploads, the row is initially inserted with source_uid as the lookup key and doc_uid=NULL; after conversion, doc_uid is computed and the row is updated. An alternative approach is to use source_uid as PK and doc_uid as a UNIQUE column that blocks FK to — the choice is an implementation detail to resolve in the DDL spec.

**schemas** — one row per schema definition (system-provided immutable or user-uploaded annotation)

| Column       | Type        | Purpose                                                       |
| ------------ | ----------- | ------------------------------------------------------------- |
| schema_ref   | TEXT PK     | e.g. strunk_18, legal_signals_v1                              |
| schema_type  | TEXT        | 'immutable' or 'annotation'                                   |
| schema_jsonb | JSONB       | Template shape (empty structure AI must fill, for annotation) |
| created_at   | TIMESTAMPTZ | Creation timestamp                                            |

CHECK constraints: schema_type IN ('immutable', 'annotation').

**blocks** — one row per block, core working table

| Column                | Type        | Source / Notes                                           |
| --------------------- | ----------- | -------------------------------------------------------- |
| block_uid             | TEXT PK     | SHA256(doc_uid + ":" + block_index).                     |
| doc_uid               | TEXT FK     | → documents.doc_uid. ON DELETE CASCADE.                  |
| block_index           | INTEGER     | Position in reading order (0-based).                     |
| block_type            | TEXT        | paragraph, heading, list_item, code, table, etc.         |
| section_path          | TEXT[]      | Heading stack location.                                  |
| char_span             | INTEGER[]   | [start, end] character offsets into stored Markdown.     |
| content_original      | TEXT        | The extracted block text.                                |
| annotation_schema_ref | TEXT        | Which annotation schema is applied.                      |
| annotation_jsonb      | JSONB       | Annotation data (initialized to template, filled by AI). |
| annotation_status     | TEXT        | pending / claimed / complete / failed.                   |
| claimed_by            | TEXT        | Worker identifier.                                       |
| claimed_at            | TIMESTAMPTZ | When worker claimed the block.                           |
| attempt_count         | INTEGER     | Number of annotation attempts (default 0).               |
| last_error            | TEXT        | Error message from most recent failure.                  |

Constraints: UNIQUE (doc_uid, block_index). block_uid matches 64-character hex. block_index >= 0. char_span elements are nonnegative and start <= end.

Indexes: blocks(doc_uid), blocks(doc_uid, block_index), documents(uploaded_at DESC).

**annotation_runs** — one row per annotation execution run

| Column           | Type        | Purpose                                        |
| ---------------- | ----------- | ---------------------------------------------- |
| run_id           | TEXT PK     | UUID4 (runs are not content-addressed).        |
| doc_uid          | TEXT FK     | → documents.doc_uid.                           |
| schema_ref       | TEXT FK     | → schemas.schema_ref.                          |
| status           | TEXT        | running / complete / failed / cancelled.       |
| total_blocks     | INTEGER     | Total blocks in document.                      |
| completed_blocks | INTEGER     | Successfully annotated (default 0).            |
| failed_blocks    | INTEGER     | Failed annotation (default 0).                 |
| started_at       | TIMESTAMPTZ | Run start time.                                |
| completed_at     | TIMESTAMPTZ | Run completion time.                           |
| failure_log      | JSONB       | Array of failed block_uids with error details. |

CHECK constraints: status IN ('running', 'complete', 'failed', 'cancelled').

### How Immutable Maps to Storage

Document-level envelope fields (doc_uid, source_uid, md_uid, source_type, source_locator, md_locator, doc_title, uploaded_at, immutable_schema_ref) are stored once on the documents table. Block-level envelope fields (block_uid, block_index, block_type, section_path, char_span) and content.original are stored as fixed columns on the blocks table. No JSONB on the immutable side — the shape is universal and never changes.

### How Annotation Maps to Storage

The schema definition (template shape) is stored in the schemas table as JSONB. At schema binding, each block row gets annotation_schema_ref set and annotation_jsonb initialized to the empty template from schemas.schema_jsonb. During annotation execution, AI workers fill annotation_jsonb per block. The shape of annotation_jsonb differs per schema — JSONB accommodates this without schema migration.

### Concurrent Annotation Pattern

Workers claim blocks atomically:

```sql
UPDATE blocks
SET annotation_status = 'claimed', claimed_by = $worker, claimed_at = now()
WHERE annotation_status = 'pending' AND doc_uid = $doc
LIMIT 1
RETURNING *
```

Each worker reads content_original and the empty annotation_jsonb template from the claimed row, calls the LLM, writes the filled annotation_jsonb back, and sets status to complete. Failed blocks record the error in last_error and increment attempt_count. Retry policy determines whether failed blocks revert to pending or stay failed.

The frontend subscribes to block status changes via Supabase Realtime for live progress display.

### JSONL Export

JSONL is assembled on demand by querying blocks joined to documents, ordered by block_index. Each row is composed into the canonical JSON record format (immutable envelope from columns + content.original + annotation from JSONB). Export does not modify the database.

### Export Branches

The same annotated block rows support multiple export paths:

- **JSONL file** — portable artifact for archival, sharing, or downstream pipelines
- **Document reconstruction** — extract updated content across blocks in order → assemble into .md → Pandoc → .docx / .pdf / .html
- **Knowledge graph ingest** — extract entities, relations, triples from annotation_jsonb across blocks → push to graph database
- **Vector indexing** — embed content_original per block with metadata from both columns and annotation_jsonb for filtered semantic search

All export paths reference the same block_uid as the universal join key.

## Example Use-Cases Supported by Swappable Schemas

### Prose / Paper / Essay (Strunk-style lens)

Immutable schema: prose ingest (md_prose_v1) produces blocks with paragraph text and navigation fields.

Annotation schema: Strunk rules schema with fields such as rule hits and (optionally) rewrite_candidate.

### Supreme Court / CAP / Law Cases (signal extraction lens)

Immutable schema: law_case_v1 classification label applied at upload. Same universal envelope; no additional immutable fields. Annotation schema defines outputs for legal objectives (signals, holdings, citations, etc.).

### KB / Knowledge Graph metadata generation

Immutable schema: kb_chunk_v1 classification label applied at upload. Same universal envelope; no additional immutable fields. Annotation schema defines extracted metadata fields used downstream.

## Frontend Requirements (Upload + Run Flow)

### Upload Document Page

Must allow:

Upload document file (.md, .docx, .pdf, .pptx, .txt)

Enter doc_title (auto-extracted from first H1 heading or filename, user-editable)

Select immutable schema from system-provided options (immutable_schema_ref)

Must show:

Upload progress and conversion status (for non-MD files)

A preview that confirms blocks were created (block_index, block_type, section_path, snippet of content_original)

Error state with human-readable message if conversion or ingest fails

### Select Annotation Schema Page

Must allow:

Select/upload annotation schema (schema_ref)

Must show:

The annotation template fields that will appear under annotation.data (read-only preview)

### Run Annotation Page

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
