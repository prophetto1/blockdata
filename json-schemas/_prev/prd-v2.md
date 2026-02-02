# PRODUCT REQUIREMENTS DOCUMENT (PRD) — Block Inventory + User-Defined Schemas + Annotation Pipeline version 2

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
      "source_type": "md",
      "source_locator": "…",
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
| immutable  | envelope | doc_uid              | Document identifier.                                                                                |
| immutable  | envelope | source_type          | Source format (v0: md).                                                                             |
| immutable  | envelope | source_locator       | Where the source file is stored.                                                                    |
| immutable  | envelope | doc_title            | User-provided document title.                                                                       |
| immutable  | envelope | uploaded_at          | Upload timestamp.                                                                                   |
| immutable  | envelope | block_uid            | Block identifier within the document.                                                               |
| immutable  | envelope | block_type           | Block kind (paragraph/heading/etc.).                                                                |
| immutable  | envelope | block_index          | Block position in reading order.                                                                    |
| immutable  | envelope | section_path         | Heading stack location of the block.                                                                |
| immutable  | envelope | char_span            | Character offsets into the raw source string.                                                       |
| immutable  | content  | original             | The extracted block text (the paragraph itself lives here).                                         |
| annotation |          | schema_ref           | The user-defined annotation schema (lens) being applied.                                            |
| annotation |          | data                 | Schema-defined output area; this is what the AI fills.                                              |

## Immutability Rule (Hard Requirement)

After ingest is complete, nothing under immutable may be modified. During annotation, annotation.schema_ref is set during schema binding (before AI execution begins); the AI fills only annotation.data.

## Ingestion Pipeline (Document → Block Inventory)

### Pre-Requisite: Markdown Document

The pipeline requires a Markdown (.md) document as input. The pipeline only executes when a valid Markdown document exists.

**Docling (separate utility):** For users with PDF, DOCX, PPTX, or other non-Markdown documents, we provide Docling (IBM, MIT license) as a separate conversion utility outside the core pipeline. Users run Docling to produce Markdown, then upload the resulting .md to the pipeline. Docling is not part of the pipeline specification; it is an optional pre-processing tool.

### Inputs

Document upload (.md file)

doc_title (user input)

immutable_schema_ref (user selection from system-provided immutable schemas)

Output:

A JSONL file: one line per block record, in reading order

Each line has immutable populated (including content.original)

annotation exists at ingest as: schema_ref: "" and data: {}; after the user selects/uploads an annotation schema, the system sets annotation.schema_ref and initializes annotation.data to the schema template.

Behavior requirements:

The paragraph text is stored inside each record at immutable.content.original (not elsewhere).

The block identity/location fields in immutable.envelope refer to the same paragraph stored in immutable.content.original.

## Ingestion Implementation Details

### Block Splitting Logic (MD → Blocks)

Blocks are produced in a single reading-order pass over the Markdown source using remark-parse (unified/remark ecosystem). The parser produces an mdast (Markdown Abstract Syntax Tree) where every node exposes position.start.offset and position.end.offset (providing char_span), a type field (providing block_type), and tree structure (providing section_path via heading nesting).

Block types: any discrete unit supported by the Markdown format (heading, paragraph, list_item, code, table, blockquote, hr, etc.). The system does not control what block types appear in a document; it extracts whatever the Markdown format defines as a block-level element.

Lists: N blocks (one per list item), including nested items (each nested item is its own list_item block). No extra nesting fields in v0; nesting is implied by reading order only.

### doc_title Auto-Extraction

Default doc_title is extracted deterministically: first H1 heading (depth === 1) found in the AST. If no H1 exists, fallback is the filename minus extension. The extracted title is presented to the user as an editable field before ingest confirmation.

### UID Generation Strategy (Idempotent)

doc_uid = SHA256(file_bytes) of the uploaded source file.

block_index = 0..N-1 in extraction order.

block_uid = SHA256(doc_uid + ":" + block_index).

No UUID4 in v0 (determinism is required).

### char_span Offset Tracking

char_span is [start, end] character offsets into the exact raw Markdown string used for parsing (half-open is fine as long as consistent).

Ingest must track offsets during extraction (either via a parser that exposes source positions or via a deterministic scanner that records start/end as it emits blocks). Placeholders are not allowed.

### source_locator (Uploaded File)

source_locator is the system storage key/path for the original uploaded file, e.g. uploads/{doc_uid}/{original_filename}.md (or the equivalent object key if using S3/etc.).

It's not derived from content; it's assigned by the upload/storage subsystem.

### Schema Validation ("Schema of Schemas")

v0 validation is simple and explicit: when a user uploads a schema artifact, the system checks it is valid JSON and contains the required top-level keys/types for that schema artifact format.

No "schema-of-schemas" is required in v0; it's just a hard validator function in code that rejects malformed schema uploads.

### section_path Edge Cases

If the document has no headings: section_path = [] for every block.

If content appears before the first heading: [] until the first heading is encountered.

## Annotation Pipeline (Block Inventory → Annotated Output)

Inputs:

JSONL block inventory produced by ingest

annotation schema selection/upload (schema_ref)

Behavior:

annotation.schema_ref is set from user selection; it is not derived from document text.

annotation.data is initialized to the template/shape defined by the chosen schema.

The AI reads each record and fills only annotation.data according to the schema.

Output:

A new JSONL file representing the same blocks in the same order where:

immutable is unchanged

annotation.data is filled for successfully annotated blocks; failed blocks retain the initialized template

### AI Annotation Execution (v0)

v0 is model/provider-agnostic: "LLM model" is a config value, not hardcoded in the PRD.

Prompt construction: the annotator receives (a) content.original, (b) the chosen schema template for annotation.data, and (c) strict rule: do not modify immutable; fill only annotation.data.

Execution: sync block-by-block in v0, with retry-on-failure per block.

Failures do not change immutable; failed blocks keep their annotation template unchanged, and failures are recorded in a run log/report (outside the JSONL).

## Error States (Ingest/Annotation)

Ingest: write output atomically (temp → finalize). If ingest fails, no partial blocks.jsonl is published.

Annotation: if block 37/200 fails, continue; output JSONL still has 200 lines in the same order, with completed blocks filled and failed blocks unchanged; run report lists failed block_uids.

## Backend Architecture (Supabase / PostgreSQL)

### Storage Model

The canonical JSON record (immutable + annotation) is the export format, not the storage format. In the database, each block is a row. Immutable envelope fields are fixed Postgres columns (queryable, indexable). Annotation data is stored as JSONB (shape varies per user-defined schema).

JSONL is generated on demand from the database at export time. The database is the source of truth.

### Why JSONB for Annotation

Annotation schemas are user-defined — the field structure changes per schema. JSONB stores this as a pre-parsed binary format that supports indexing, querying (annotation_jsonb->>'field_name'), and containment checks without re-parsing. All annotation columns use JSONB, never JSON.

### Table Design

**documents** — one row per uploaded document

| Column               | Type        | Source                                               |
| -------------------- | ----------- | ---------------------------------------------------- |
| doc_uid              | TEXT PK     | SHA256(file_bytes)                                   |
| source_type          | TEXT        | Format identifier (v0: md)                           |
| source_locator       | TEXT        | Storage path for uploaded file                       |
| doc_title            | TEXT        | Auto-extracted from first H1, user-editable          |
| uploaded_at          | TIMESTAMPTZ | Upload timestamp                                     |
| immutable_schema_ref | TEXT        | Classification label (e.g. md_prose_v1, law_case_v1) |

**schemas** — one row per schema definition (system-provided immutable or user-uploaded annotation)

| Column       | Type        | Purpose                                                       |
| ------------ | ----------- | ------------------------------------------------------------- |
| schema_ref   | TEXT PK     | e.g. strunk_18, legal_signals_v1                              |
| schema_type  | TEXT        | 'immutable' or 'annotation'                                   |
| schema_jsonb | JSONB       | Template shape (empty structure AI must fill, for annotation) |
| created_at   | TIMESTAMPTZ | Creation timestamp                                            |

**blocks** — one row per block, core working table

| Column                | Type        | Source                                                  |
| --------------------- | ----------- | ------------------------------------------------------- |
| block_uid             | TEXT PK     | SHA256(doc_uid + ":" + block_index)                     |
| doc_uid               | TEXT FK     | → documents                                             |
| block_index           | INTEGER     | Position in reading order (0-based)                     |
| block_type            | TEXT        | paragraph, heading, list_item, code, table, etc.        |
| section_path          | TEXT[]      | Heading stack location                                  |
| char_span             | INTEGER[]   | [start, end] character offsets into raw Markdown        |
| content_original      | TEXT        | The extracted block text                                |
| annotation_schema_ref | TEXT        | Which annotation schema is applied                      |
| annotation_jsonb      | JSONB       | Annotation data (initialized to template, filled by AI) |
| annotation_status     | TEXT        | pending / claimed / complete / failed                   |
| claimed_by            | TEXT        | Worker identifier                                       |
| claimed_at            | TIMESTAMPTZ | When worker claimed the block                           |
| attempt_count         | INTEGER     | Number of annotation attempts (default 0)               |
| last_error            | TEXT        | Error message from most recent failure                  |

Constraint: UNIQUE (doc_uid, block_index)

**annotation_runs** — one row per annotation execution run

| Column           | Type        | Purpose                                       |
| ---------------- | ----------- | --------------------------------------------- |
| run_id           | TEXT PK     | UUID4 (runs are not content-addressed)        |
| doc_uid          | TEXT FK     | → documents                                   |
| schema_ref       | TEXT FK     | → schemas                                     |
| status           | TEXT        | running / complete / failed / cancelled       |
| total_blocks     | INTEGER     | Total blocks in document                      |
| completed_blocks | INTEGER     | Successfully annotated (default 0)            |
| failed_blocks    | INTEGER     | Failed annotation (default 0)                 |
| started_at       | TIMESTAMPTZ | Run start time                                |
| completed_at     | TIMESTAMPTZ | Run completion time                           |
| failure_log      | JSONB       | Array of failed block_uids with error details |

### How Immutable Maps to Storage

Document-level envelope fields (doc_uid, source_type, source_locator, doc_title, uploaded_at, immutable_schema_ref) are stored once on the documents table. Block-level envelope fields (block_uid, block_index, block_type, section_path, char_span) and content.original are stored as fixed columns on the blocks table. No JSONB on the immutable side — the shape is universal and never changes.

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

Upload document file (.md) — optionally, frontend may offer Docling conversion as a separate step before pipeline entry

Enter doc_title (auto-extracted from first H1 heading or filename, user-editable)

Select immutable schema from system-provided options (immutable_schema_ref)

Must show:

A preview that confirms blocks were created (block_index, block_type, section_path, snippet of content.original)

### Select Annotation Schema Page

Must allow:

Select/upload annotation schema (schema_ref)

Must show:

The annotation template fields that will appear under annotation.data (read-only preview)

### Run Annotation Page

Must show:

Progress across blocks

Per-block view combining:

immutable.content.original

annotation.data outputs

## Spec Writing Requirements (Process Requirement)

All future spec text and explanations must:

Show the JSON shape first

Explain fields strictly in the same order as the JSON

Avoid introducing new mechanisms or alternate designs midstream
