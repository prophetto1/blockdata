# DDL Plan — Immutable Ingest (Phase 1) + Multi‑Schema Annotation (Phase 2)

This document lists *all database (DDL) activities* to implement the pipeline described in `json-schemas/prd-v4.md`, in a phased order.

## Principles

- **Immutable substrate**: `documents` + `blocks` are deterministic outputs of ingest. Once ingested, these rows are not mutated except for lifecycle/status fields on `documents`.
- **Multi-schema annotation**: the same document (and the same block) can be annotated under multiple schemas. This requires a separate table keyed by `(run_id, block_uid)`.
- **Storage boundary**: the Python conversion service is storage-only (no Postgres access). Only Edge Functions write to Postgres.

## Resolved Decisions (before writing final SQL)

1) **Ownership + RLS readiness**
   - Add `owner_id UUID NOT NULL` to `documents` now.
   - `blocks` derives ownership via `blocks.doc_uid → documents.doc_uid` (no `owner_id` column on blocks).
   - Note: with `source_uid` as the primary key, the same uploaded blob cannot be stored twice under different owners. If that becomes a requirement later, introduce a separate per-user “document instances” table or change the keying strategy.

2) **UUID types**
   - Use `UUID` for non-content-addressed identifiers:
     - `documents.conversion_job_id UUID`
     - `annotation_runs.run_id UUID`

3) **Span type**
   - Keep `char_span INTEGER[]` with a strict `[start,end]` constraint, or switch to a range type (`int4range`). Phase 1 currently assumes `INTEGER[]`.

4) **Lifecycle fields**
   - Keep `documents.status` values exactly: `uploaded | converting | ingested | conversion_failed | ingest_failed`.
   - Add `documents.updated_at` + trigger (required) to track status/error transitions.

## Phase 1 — Immutable Pipeline (DDL activities)

### 0) Extensions (required)

- `pgcrypto` (for `gen_random_uuid()` defaults)
- `pg_cron` (required safety net: stale conversion TTL cleanup)

### 1) `documents` table

**Goal:** one row per upload lifecycle, anchored by `source_uid` (always computable at upload time). `doc_uid` is computed only once Markdown exists.

Columns (baseline):

- `owner_id UUID NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `source_uid TEXT PRIMARY KEY`
  - Meaning: SHA256(`source_type + "\n" + raw_source_bytes`)
- `md_uid TEXT UNIQUE NULL`
  - Meaning: SHA256(raw_markdown_bytes)
- `doc_uid TEXT UNIQUE NULL`
  - Meaning: SHA256(`immutable_schema_ref + "\n" + md_uid`)
  - NOTE: `blocks.doc_uid` will FK to this column once populated.
- `source_type TEXT NOT NULL`
  - Allowed: `md | docx | pdf | txt`
- `source_locator TEXT NOT NULL`
- `md_locator TEXT NULL`
- `immutable_schema_ref TEXT NOT NULL`
  - Classification label (e.g., `md_prose_v1`, `law_case_v1`)
- `doc_title TEXT NOT NULL`
- `uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `conversion_job_id UUID NULL`
  - Set when conversion starts. Callback must match (reject stale callbacks).
- `status TEXT NOT NULL DEFAULT 'uploaded'`
  - `CHECK (status IN ('uploaded','converting','ingested','conversion_failed','ingest_failed'))`
- `error TEXT NULL`

Constraints (baseline):

- Hex checks (sha256):
  - `CHECK (source_uid ~ '^[0-9a-f]{64}$')`
  - `CHECK (md_uid IS NULL OR md_uid ~ '^[0-9a-f]{64}$')`
  - `CHECK (doc_uid IS NULL OR doc_uid ~ '^[0-9a-f]{64}$')`
- Null dependency chain:
  - `CHECK (doc_uid IS NULL OR md_uid IS NOT NULL)`
  - `CHECK (md_locator IS NULL OR md_uid IS NOT NULL)`
- Source type check:
  - `CHECK (source_type IN ('md','docx','pdf','txt'))`

Indexes:

- `documents(uploaded_at DESC)`
- (optional) `documents(status, uploaded_at DESC)` for operational dashboards
- (optional) `documents(md_uid)` if we need lookup/dedupe by md content

Triggers (required):

- `updated_at` maintenance trigger on UPDATE. (Required.)

Scheduled jobs (required):

- TTL cleanup for stale conversions (pg_cron):
  - `UPDATE documents SET status='conversion_failed', error='conversion timed out (stale)' WHERE status='converting' AND uploaded_at < now() - interval '5 minutes';`

### 2) `blocks` table (immutable-only)

**Goal:** one row per extracted block in reading order. No annotation columns in Phase 1.

Columns:

- `block_uid TEXT PRIMARY KEY`
  - Meaning: SHA256(`doc_uid + ":" + block_index`)
- `doc_uid TEXT NOT NULL`
  - FK → `documents(doc_uid)` ON DELETE CASCADE
- `block_index INTEGER NOT NULL`
- `block_type TEXT NOT NULL`
- `section_path TEXT[] NOT NULL DEFAULT '{}'`
- `char_span INTEGER[] NOT NULL`
  - `[start,end]` offsets into the Markdown at `documents.md_locator`
- `content_original TEXT NOT NULL`

Constraints:

- Unique position:
  - `UNIQUE (doc_uid, block_index)`
- Hash format:
  - `CHECK (block_uid ~ '^[0-9a-f]{64}$')`
- Index domain:
  - `CHECK (block_index >= 0)`
- Span validity (array form):
  - `CHECK (array_length(char_span, 1) = 2)`
  - `CHECK (char_span[1] >= 0 AND char_span[2] >= 0 AND char_span[1] <= char_span[2])`

Indexes:

- `blocks(doc_uid)`
- `blocks(doc_uid, block_index)`

### 3) RLS / Grants (Phase 1)

Because writes come only from Edge Functions (service role), RLS is focused on reads:

- Enable RLS on `documents` and `blocks`.
- Policies:
  - Allow SELECT where `documents.owner_id = auth.uid()`
  - Disallow client INSERT/UPDATE/DELETE (Edge Functions only).

## Phase 2 — Multi‑Schema Annotation (DDL activities)

Phase 2 introduces schema reuse and per-run annotation outputs without duplicating immutable data.

### 4) `schemas` table (user-defined schemas)

Columns:

- `schema_ref TEXT PRIMARY KEY`
  - Stable identifier (e.g., `strunk_18`, `legal_signals_v1`)
- `schema_jsonb JSONB NOT NULL`
  - Template/contract for annotation outputs
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### 5) `annotation_runs` table (one run per doc+schema)

Columns:

- `run_id UUID PRIMARY KEY` (UUID4)
- `doc_uid TEXT NOT NULL` FK → `documents(doc_uid)` ON DELETE CASCADE
- `schema_ref TEXT NOT NULL` FK → `schemas(schema_ref)`
- `status TEXT NOT NULL`
  - `CHECK (status IN ('running','complete','failed','cancelled'))`
- `started_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `completed_at TIMESTAMPTZ NULL`
- Counters/logs (required):
  - `total_blocks INTEGER NOT NULL`
  - `completed_blocks INTEGER NOT NULL DEFAULT 0`
  - `failed_blocks INTEGER NOT NULL DEFAULT 0`
  - `failure_log JSONB NOT NULL DEFAULT '[]'::jsonb`

Indexes:

- `annotation_runs(doc_uid, started_at DESC)`
- `annotation_runs(schema_ref, started_at DESC)`

### 6) `block_annotations` table (one row per block per run)

This table is the core of “one doc → many schemas”.

Columns:

- `run_id UUID NOT NULL` FK → `annotation_runs(run_id)` ON DELETE CASCADE
- `block_uid TEXT NOT NULL` FK → `blocks(block_uid)` ON DELETE CASCADE
- `annotation_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb`
- `status TEXT NOT NULL DEFAULT 'pending'`
  - `CHECK (status IN ('pending','claimed','complete','failed'))`
- Claim metadata:
  - `claimed_by TEXT NULL`
  - `claimed_at TIMESTAMPTZ NULL`
  - `attempt_count INTEGER NOT NULL DEFAULT 0`
  - `last_error TEXT NULL`

Primary key:

- `PRIMARY KEY (run_id, block_uid)`

Indexes (for claim loop + UI):

- `block_annotations(run_id, status)`
- Partial index for fast claiming:
  - `CREATE INDEX ... ON block_annotations(run_id, block_uid) WHERE status='pending';`

## Migration Sequencing (recommended)

1) Phase 1 migration: extensions (required), `documents`, `blocks`, indexes, constraints, `updated_at` trigger (required).
2) Configure Storage buckets and Edge Functions (not DDL, but depends on Phase 1 schema).
3) Phase 2 migration: `schemas`, `annotation_runs`, `block_annotations`, indexes, constraints.
4) Phase 2 (optional): RLS policies for new tables (schemas visibility, run ownership, per-run annotations visibility).
