# Database vs PRD v4 Comparison

Date: 2026-02-03
Status: Analysis complete

This document compares the live Supabase PostgreSQL schema against the PRD v4 specification and DDL plan.

---

## `documents` table — MATCHES

| Column | PRD v4 | DB | Status |
|--------|--------|-----|--------|
| source_uid | TEXT PK | TEXT PK | ✅ |
| owner_id | UUID | UUID | ✅ |
| md_uid | TEXT UNIQUE NULL | TEXT UNIQUE NULL | ✅ |
| doc_uid | TEXT UNIQUE NULL | TEXT UNIQUE NULL | ✅ |
| source_type | TEXT | TEXT | ✅ |
| source_locator | TEXT | TEXT | ✅ |
| md_locator | TEXT NULL | TEXT NULL | ✅ |
| doc_title | TEXT | TEXT | ✅ |
| uploaded_at | TIMESTAMPTZ | TIMESTAMPTZ | ✅ |
| updated_at | TIMESTAMPTZ | TIMESTAMPTZ | ✅ |
| immutable_schema_ref | TEXT | TEXT | ✅ |
| conversion_job_id | UUID NULL | UUID NULL | ✅ |
| status | TEXT | TEXT | ✅ |
| error | TEXT NULL | TEXT NULL | ✅ |

**Extra constraint (good):** `documents_converting_requires_job` — ensures `conversion_job_id` is set when status='converting'

---

## `blocks` table — MATCHES

| Column | PRD v4 | DB | Status |
|--------|--------|-----|--------|
| block_uid | TEXT PK | TEXT PK | ✅ |
| doc_uid | TEXT FK | TEXT FK | ✅ |
| block_index | INTEGER | INTEGER | ✅ |
| block_type | TEXT | TEXT | ✅ |
| section_path | TEXT[] | TEXT[] | ✅ |
| char_span | INTEGER[] | INTEGER[] | ✅ |
| content_original | TEXT | TEXT | ✅ |

**Constraints present:**

- ✅ `block_uid` hex format check
- ✅ `block_index >= 0`
- ✅ `char_span` length = 2
- ✅ `char_span` values >= 0
- ✅ `char_span[1] <= char_span[2]`
- ✅ `UNIQUE (doc_uid, block_index)`

---

## `schemas` table — DEVIATES

| Column | PRD v4 / DDL Plan | DB Actual | Issue |
|--------|-------------------|-----------|-------|
| PK | `schema_ref TEXT` | `schema_id UUID` | **Different PK** |
| owner_id | *not specified* | `UUID NOT NULL` | Added for RLS |
| schema_ref | PK | TEXT (not PK) | Demoted |
| schema_uid | *not in DDL* | TEXT | **Added** |
| schema_jsonb | JSONB | JSONB | ✅ |
| created_at | TIMESTAMPTZ | TIMESTAMPTZ | ✅ |

**Key deviations:**

1. **PK changed** from `schema_ref` (natural key) to `schema_id` (surrogate UUID)
2. **Added `owner_id`** for per-user schema ownership (RLS)
3. **Added `schema_uid`** — content hash of schema (supports idempotent uploads)
4. **Unique constraint** is `(owner_id, schema_ref)` — same ref can exist for different users

---

## `annotation_runs` table — DEVIATES

| Column | PRD v4 / DDL Plan | DB Actual | Issue |
|--------|-------------------|-----------|-------|
| run_id | UUID PK | UUID PK | ✅ |
| owner_id | *not specified* | UUID | Added for RLS |
| doc_uid | TEXT FK | TEXT FK | ✅ |
| schema_ref | TEXT FK → schemas(schema_ref) | — | **Missing** |
| schema_id | *not specified* | UUID FK → schemas(schema_id) | **Different FK** |
| status | TEXT | TEXT | ✅ |
| total_blocks | INTEGER | INTEGER | ✅ |
| completed_blocks | INTEGER | INTEGER | ✅ |
| failed_blocks | INTEGER | INTEGER | ✅ |
| started_at | TIMESTAMPTZ | TIMESTAMPTZ | ✅ |
| completed_at | TIMESTAMPTZ NULL | TIMESTAMPTZ NULL | ✅ |
| failure_log | JSONB | JSONB | ✅ |

**Key deviations:**

1. **FK is `schema_id`** (UUID) instead of `schema_ref` (TEXT)
2. **Added `owner_id`** for RLS

---

## `block_annotations` table — MATCHES

All columns and constraints match PRD v4.

| Column | PRD v4 | DB | Status |
|--------|--------|-----|--------|
| run_id | UUID FK | UUID FK | ✅ |
| block_uid | TEXT FK | TEXT FK | ✅ |
| annotation_jsonb | JSONB | JSONB | ✅ |
| status | TEXT | TEXT | ✅ |
| claimed_by | TEXT NULL | TEXT NULL | ✅ |
| claimed_at | TIMESTAMPTZ NULL | TIMESTAMPTZ NULL | ✅ |
| attempt_count | INTEGER | INTEGER | ✅ |
| last_error | TEXT NULL | TEXT NULL | ✅ |

**Primary key:** `(run_id, block_uid)` ✅

---

## Indexes — BETTER than spec

All DDL plan indexes present, plus additional helpful ones:

**Required by DDL plan (all present):**

- ✅ `idx_blocks_doc_uid`
- ✅ `idx_blocks_doc_uid_block_index`
- ✅ `idx_documents_uploaded_at`
- ✅ `idx_annotation_runs_doc_started_at`
- ✅ `idx_block_annotations_run_status`
- ✅ `idx_block_annotations_run_block_uid_pending` (partial index for claim loop)

**Additional indexes (RLS-optimized):**

- ✅ `idx_documents_owner_uploaded_at`
- ✅ `idx_annotation_runs_owner_started_at`
- ✅ `schemas_unique_owner_ref`
- ✅ `schemas_unique_owner_uid`

---

## Summary of Mismatches

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| `schemas` PK is UUID not `schema_ref` | Architectural change | **Keep as-is** — UUID PK + owner_id enables multi-tenant, `schema_ref` becomes a user-facing slug |
| `schemas.schema_uid` added | Not in DDL plan | **Keep** — enables idempotent schema uploads, mentioned in canonical output |
| `annotation_runs.schema_id` FK | Cascades from schemas change | **Keep** — follows from UUID PK decision |
| `owner_id` on Phase 2 tables | Not in PRD/DDL plan | **Keep** — required for RLS |

---

## Verdict

The deviations are **intentional improvements** for multi-tenancy and RLS, not bugs. The PRD v4 and DDL plan should be updated to reflect:

1. `schemas` uses `schema_id` (UUID) as PK, with `(owner_id, schema_ref)` as the unique business key
2. `schemas` includes `schema_uid` (content hash) for idempotent uploads
3. `annotation_runs` FKs to `schemas.schema_id` not `schema_ref`
4. All Phase 2 tables include `owner_id` for RLS

---

## Appendix: Full Constraint List

### documents

- `documents_source_uid_hex` — `source_uid ~ '^[0-9a-f]{64}$'`
- `documents_md_uid_hex` — `md_uid IS NULL OR md_uid ~ '^[0-9a-f]{64}$'`
- `documents_doc_uid_hex` — `doc_uid IS NULL OR doc_uid ~ '^[0-9a-f]{64}$'`
- `documents_source_type` — `source_type IN ('md', 'docx', 'pdf', 'txt')`
- `documents_status` — `status IN ('uploaded', 'converting', 'ingested', 'conversion_failed', 'ingest_failed')`
- `documents_doc_uid_requires_md_uid` — `doc_uid IS NULL OR md_uid IS NOT NULL`
- `documents_md_locator_requires_md_uid` — `md_locator IS NULL OR md_uid IS NOT NULL`
- `documents_converting_requires_job` — `status <> 'converting' OR conversion_job_id IS NOT NULL`

### blocks

- `blocks_block_uid_hex` — `block_uid ~ '^[0-9a-f]{64}$'`
- `blocks_block_index_nonneg` — `block_index >= 0`
- `blocks_char_span_len` — `array_length(char_span, 1) = 2`
- `blocks_char_span_nonneg` — `char_span[1] >= 0 AND char_span[2] >= 0`
- `blocks_char_span_order` — `char_span[1] <= char_span[2]`

### schemas

- `schemas_schema_ref_format` — `schema_ref ~ '^[a-z0-9][a-z0-9_-]{0,63}$'`
- `schemas_schema_uid_hex` — `schema_uid ~ '^[0-9a-f]{64}$'`

### annotation_runs

- `annotation_runs_status` — `status IN ('running', 'complete', 'failed', 'cancelled')`
- `annotation_runs_counters_nonneg` — `total_blocks >= 0 AND completed_blocks >= 0 AND failed_blocks >= 0`

### block_annotations

- `block_annotations_status` — `status IN ('pending', 'claimed', 'complete', 'failed')`
- `block_annotations_attempt_nonneg` — `attempt_count >= 0`
