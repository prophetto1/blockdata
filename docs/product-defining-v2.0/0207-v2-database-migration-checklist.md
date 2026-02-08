# v2 Database Migration Checklist

**Created:** 2026-02-07
**Purpose:** Track all remaining work to complete the v1 → v2 database migration.
**Companion docs:**
- `0207-immutable-fields.md` (v2 field definitions + pairing rules)
- `0207-prd-tech-spec-doc2.md` (canonical output contract, Sections 1–10)
- `0207-blocks.md` (block types + hybrid extraction)
- `0207-db-status-check.md` (v1 schema snapshot for comparison)

---

## Current State (updated 2026-02-08 — MIGRATION COMPLETE, Steps 1–9 done)

| Asset | Status |
|---|---|
| `documents_v2` table | Live (3 rows migrated from v1) |
| `blocks_v2` table | Live (563 rows migrated from v1, `code` → `code_block` mapped) |
| `runs_v2` table | Live (1 row migrated from v1 `annotation_runs`) |
| `block_overlays_v2` table | Live (347 rows migrated from v1 `block_annotations`, block_uid remapped) |
| `schemas` table | Live (shared between v1 and v2, 1 row) |
| v1 tables (`documents`, `blocks`, `annotation_runs`, `block_annotations`) | **FROZEN** — reject-write triggers prevent all INSERT/UPDATE/DELETE. Data retained read-only. |
| Repo migration files | 5 files under `supabase/migrations/` — all synced with live DB |
| Edge Functions | 5 deployed — `ingest`, `conversion-complete`, `runs`, `export-jsonl` updated to v2 tables; `schemas` unchanged (shared table) |
| Smoke tests | 4 scripts — all updated to validate v2 shape, v2 field names, v2 block_type enum |
| pg_cron stale-conversion jobs | 1 job: v2 only (`stale_conversion_cleanup_v2` on `public.documents_v2`). v1 job removed. |
| RPC functions | `create_run_v2` (v2, with `SET search_path`), `set_updated_at` (fixed search_path). v1 `create_annotation_run` dropped. |
| Security advisories | 0 DB advisories remaining. Leaked password protection still disabled (Auth dashboard config, not DB). |

---

## Step 1: Lock the v2 contract as the target

**Goal:** DB must support the v2 immutable substrate (`source_uid` / `conv_uid` / `block_uid`, `block_locator`, normalized `block_type`) + per-run per-block overlays that export as `{ immutable, user_defined }`.

- [x] v2 immutable field definitions finalized (`0207-immutable-fields.md`)
- [x] v2 block type enum finalized (`0207-blocks.md`)
- [x] v2 canonical export shape finalized (`0207-prd-tech-spec-doc2.md`, Section 5)
- [x] Pairing rules codified (`conv_parsing_tool` → `conv_representation_type` → `block_locator.type`)
- [x] `documents_v2` table created with v2 schema
- [x] `blocks_v2` table created with v2 schema
- [x] Cross-field CHECK constraint enforces pairing rules in `documents_v2`
- [x] `block_locator` CHECK ensures `type` key present in `blocks_v2`
- [x] `block_uid` format changed from hex-only to `conv_uid:block_index`
- [ ] Review and ratify PROPOSED enums (`source_type`, `conv_status`, `conv_parsing_tool`) — currently accepted as-is but labeled PROPOSED in spec

---

## Step 2: Bring the repo migrations in sync with the live Supabase DB

**Goal:** Every migration applied to the live DB has a corresponding file under `supabase/migrations/`.

**Current gap:** Migration 003 (`003_v2_parallel_documents_blocks`) is applied live but has no file in the repo.

- [x] Add `supabase/migrations/20260208022131_003_v2_parallel_documents_blocks.sql` to repo
- [x] Add `supabase/migrations/20260208024248_004_v2_phase2_runs_overlays_rpc_cron.sql` to repo
- [x] Verify the 4 repo migration files match the 4 migrations listed by `supabase migrations list`

**Files (all synced):**
```
supabase/migrations/
  20260202102234_001_phase1_immutable_documents_blocks.sql
  20260202120000_002_phase2_schemas_runs_block_annotations.sql
  20260208022131_003_v2_parallel_documents_blocks.sql
  20260208024248_004_v2_phase2_runs_overlays_rpc_cron.sql
```

---

## Step 3: Add the missing v2 Phase 2 tables (runs + overlays)

**Goal:** Create v2 equivalents of `annotation_runs` and `block_annotations` that reference the v2 tables and use v2 naming.

### 3a. `runs_v2` table

| Column | Type | Notes |
|---|---|---|
| `run_id` | UUID PK (default `gen_random_uuid()`) | Same as v1 |
| `owner_id` | UUID NOT NULL | For RLS |
| `conv_uid` | TEXT NOT NULL FK → `documents_v2(conv_uid)` | Replaces v1 `doc_uid` |
| `schema_id` | UUID NOT NULL FK → `schemas(schema_id)` | Same as v1 |
| `model_config` | JSONB | **New in v2** — tracks provider, model name, parameters per run |
| `status` | TEXT NOT NULL DEFAULT `'running'` | CHECK: `running`, `complete`, `failed`, `cancelled` |
| `total_blocks` | INTEGER NOT NULL | |
| `completed_blocks` | INTEGER NOT NULL DEFAULT 0 | |
| `failed_blocks` | INTEGER NOT NULL DEFAULT 0 | |
| `started_at` | TIMESTAMPTZ NOT NULL DEFAULT `now()` | |
| `completed_at` | TIMESTAMPTZ NULL | |
| `failure_log` | JSONB DEFAULT `'[]'` | |

- [x] Create `runs_v2` table with above schema
- [x] Add CHECK constraints (status enum, counters non-negative)
- [x] Add indexes: `(owner_id, started_at DESC)`, `(conv_uid)`

### 3b. `block_overlays_v2` table

| Column | Type | Notes |
|---|---|---|
| `run_id` | UUID FK → `runs_v2(run_id)` | |
| `block_uid` | TEXT FK → `blocks_v2(block_uid)` | |
| `overlay_jsonb` | JSONB DEFAULT `'{}'` | Replaces v1 `annotation_jsonb` — becomes `user_defined.data` at export |
| `status` | TEXT NOT NULL DEFAULT `'pending'` | CHECK: `pending`, `claimed`, `complete`, `failed` |
| `claimed_by` | TEXT NULL | Worker identity |
| `claimed_at` | TIMESTAMPTZ NULL | |
| `attempt_count` | INTEGER DEFAULT 0 | CHECK: `>= 0` |
| `last_error` | TEXT NULL | |
| PK | `(run_id, block_uid)` | Composite |

- [x] Create `block_overlays_v2` table with above schema
- [x] Add CHECK constraints (status enum, attempt_count non-negative)
- [x] Add indexes: `(run_id, status)`, partial index `(run_id, block_uid) WHERE status = 'pending'` for claim loop
- [x] Migrate v1 annotation_runs → runs_v2 data (1 row migrated)
- [x] Migrate v1 block_annotations → block_overlays_v2 data (347 rows migrated, block_uid remapped from hex to `conv_uid:index` format)

---

## Step 4: Add the v2 RPC that creates a run atomically

**Goal:** Implement `create_run_v2(p_owner_id, p_conv_uid, p_schema_id)` as the v2 equivalent of the existing `create_annotation_run(...)`.

**Logic:**
1. Validate `documents_v2` row exists for `p_owner_id` + `p_conv_uid` and `status = 'ingested'`
2. INSERT into `runs_v2` (new `run_id`, owner, conv_uid, schema_id, total_blocks from document)
3. INSERT one `pending` row per block from `blocks_v2 WHERE conv_uid = p_conv_uid` (ordered by `block_index`)
4. RETURN the new `run_id`

- [x] Create `create_run_v2` function with `SET search_path = ''` (fix the security advisory pattern)
- [x] Validates edge cases: document not found, document not ingested, zero blocks (raises exception)
- [ ] Test with existing data (create a run against one of the 3 migrated documents)

**Existing v1 function for reference:** `create_annotation_run` (uses `doc_uid`, inserts into `annotation_runs` + `block_annotations`)

---

## Step 5: Add RLS policies for v2 Phase 2 tables

**Goal:** Same pattern as v1 — SELECT only for authenticated users, writes via service role.

| Table | Policy | Rule |
|---|---|---|
| `runs_v2` | `runs_v2_select_own` | `owner_id = auth.uid()` |
| `block_overlays_v2` | `block_overlays_v2_select_own` | `EXISTS (SELECT 1 FROM runs_v2 r WHERE r.run_id = block_overlays_v2.run_id AND r.owner_id = auth.uid())` |

- [x] Enable RLS on `runs_v2`
- [x] Enable RLS on `block_overlays_v2`
- [x] Create SELECT policies as above
- [x] Verify no INSERT/UPDATE/DELETE policies (writes via service role only)

**Already done for v2 Phase 1:**
- [x] `documents_v2`: `documents_v2_select_own` (owner_id = auth.uid())
- [x] `blocks_v2`: `blocks_v2_select_own` (conv_uid in owner's documents)

---

## Step 6: Extend the conversion safety net to v2

**Goal:** The existing pg_cron job marks stale conversions in `public.documents`. Add the same behavior for `documents_v2`.

**Current cron job** (job ID 1, runs every minute):
```sql
UPDATE public.documents
SET status = 'conversion_failed',
    error = COALESCE(error, 'conversion timed out (stale)')
WHERE status = 'converting'
  AND uploaded_at < now() - INTERVAL '5 minutes';
```

- [x] Add cron job `stale_conversion_cleanup_v2` for `documents_v2` (job ID 2, runs every minute)
- [x] Verify cron extension is enabled (`pg_cron` 1.6.4 active, 2 jobs running)

---

## Step 7: Cut over the Edge Functions to v2 reads/writes

**Goal:** All 5 Edge Functions switch from v1 tables to v2 tables.

### 7a. `ingest` (POST, JWT auth)

Currently writes to: `documents` + `blocks`
Must write to: `documents_v2` + `blocks_v2`

- [x] Compute and store `conv_uid` (v2 formula: `sha256(conv_parsing_tool + "\n" + conv_representation_type + "\n" + conv_representation_bytes)`)
- [x] Compute `block_uid` as `conv_uid + ":" + block_index` (not SHA256 hash)
- [x] Write `block_locator` as JSONB typed object (`{ "type": "text_offset_range", "start_offset": ..., "end_offset": ... }`) instead of `char_span` integer array
- [x] Map mdast `code` → v2 `code_block` in block_type normalization (also: `thematic_break` → `divider`, `footnoteDefinition` → `footnote`, `html` → `html_block`, unknown → `other`)
- [x] Populate new `documents_v2` fields: `conv_parsing_tool`, `conv_representation_type`, `conv_status`, `conv_total_blocks`, `conv_block_type_freq`, `conv_total_characters`, `source_total_characters`, `source_filesize`, `conv_locator`
- [x] Remove writes to legacy fields: `md_uid`, `doc_uid`, `immutable_schema_ref`, `section_path`
- [x] Remove `immutable_schema_ref` form field requirement (v2 schemas are separate runs, not document-level)
- [x] Update idempotency check to `documents_v2.source_uid`
- [x] Response returns `conv_uid` instead of `doc_uid`

### 7b. `conversion-complete` (POST, API key auth)

Currently writes to: `documents` + `blocks`
Must write to: `documents_v2` + `blocks_v2`

- [x] Writes to `documents_v2` + `blocks_v2` with v2 field names and identifiers
- [x] Computes `conv_uid` using v2 formula, `block_uid` as `conv_uid:index`
- [x] Writes `block_locator` as `{ "type": "text_offset_range", "start_offset": ..., "end_offset": ... }`
- [x] Populates all `conv_*` fields: `conv_parsing_tool = 'mdast'`, `conv_representation_type = 'markdown_bytes'`, `conv_status`, `conv_total_blocks`, `conv_block_type_freq`, `conv_total_characters`, `conv_locator`
- [x] Removes legacy field writes: `md_uid`, `doc_uid`, `immutable_schema_ref`, `md_locator`, `section_path`
- [ ] **Future:** True Docling track (DoclingDocument JSON → blocks directly with `docling_json_pointer` locators) — requires Python service changes to return structured JSON instead of Markdown

### 7c. `schemas` (POST, JWT auth)

Currently writes to: `schemas`
No table change needed (schemas table is shared between v1 and v2).

- [x] Verified `schemas` table structure is compatible (UUID PK + `schema_ref` + `schema_uid` + `schema_jsonb`)
- [x] No code changes required

### 7d. `runs` (POST, JWT auth)

Currently writes to: `annotation_runs` + `block_annotations` via `create_annotation_run`
Must write to: `runs_v2` + `block_overlays_v2` via `create_run_v2`

- [x] Switch from `doc_uid` parameter to `conv_uid`
- [x] Call `create_run_v2` RPC instead of `create_annotation_run`
- [x] Accept optional `model_config` in request body (UPDATE after RPC since RPC doesn't accept it)
- [x] Return `run_id` + `total_blocks` in response

### 7e. `export-jsonl` (GET, JWT auth)

Currently reads from: `documents` + `blocks` + `annotation_runs` + `block_annotations`
Must read from: `documents_v2` + `blocks_v2` + `runs_v2` + `block_overlays_v2`

- [x] Phase 1 export (by `conv_uid`): emits v2 canonical shape with `{ immutable: { source_upload, conversion, block }, user_defined: { schema_ref: null, schema_uid: null, data: {} } }`
- [x] Phase 2 export (by `run_id`): emits v2 canonical shape with `user_defined.data` populated from `block_overlays_v2.overlay_jsonb`
- [x] Renamed export key from `annotation` → `user_defined`
- [x] Assembles `immutable.source_upload`, `immutable.conversion`, and `immutable.block` sub-objects from `documents_v2` + `blocks_v2` columns
- [x] Ordered by `block_index` ascending
- [x] Accepts `conv_uid` query param instead of `doc_uid`

---

## Step 8: Update smoke tests to v2

**Goal:** All 4 smoke test scripts validate against v2 tables, v2 field names, and v2 export shape.

| Script | What it tests | v2 changes needed |
|---|---|---|
| `smoke-test.ps1` | .md ingest + Phase 1 export | Check `conv_uid` instead of `doc_uid`; validate v2 export shape (`immutable.source_upload`, `immutable.conversion`, `immutable.block`, `user_defined`) |
| `smoke-test-schema-run.ps1` | Schema upload + run creation + Phase 2 export | Check `conv_uid` param on run create; validate `user_defined.data` instead of `annotation.data` |
| `smoke-test-gfm-blocktypes.ps1` | GFM block type coverage | Validate v2 `block_type` enum values (e.g., `code_block` not `code`) |
| `smoke-test-non-md.ps1` | Non-markdown conversion pipeline | Poll `documents_v2`, check `conv_uid`, validate v2 export shape (still mdast track — true Docling track is future) |

- [x] Update `smoke-test.ps1` — removed `immutable_schema_ref`, `doc_uid` → `conv_uid`, v2 export shape validation (`immutable.source_upload`, `.conversion`, `.block`, `user_defined`), pairing rule checks
- [x] Update `smoke-test-schema-run.ps1` — `conv_uid` in run creation body, `user_defined.schema_ref`/`.schema_uid`/`.data` instead of `annotation.*`, v2 immutable structure validation
- [x] Update `smoke-test-gfm-blocktypes.ps1` — `conv_uid` instead of `doc_uid`, block_type path `immutable.block.block_type`, required types: `code_block` (was `code`), `footnote` (was `footnote_definition`)
- [x] Update `smoke-test-non-md.ps1` — removed `ImmutableSchemaRef` param, poll `documents_v2` instead of `documents`, `conv_uid` instead of `doc_uid`, v2 export shape + pairing rule validation
- [x] Pairing rule validation in all scripts: `conv_parsing_tool = 'mdast'`, `conv_representation_type = 'markdown_bytes'`, `block_locator.type = 'text_offset_range'`

---

## Step 9: Decide and execute the final cutover strategy

**Decision: Option A (Parallel mode)** — chosen 2026-02-08. v2 tables keep `_v2` suffix. v1 tables frozen read-only.

### Option A: Parallel mode (chosen)

Keep `*_v2` table names. All new ingestion/runs/exports use v2 tables. V1 tables remain read-only for historical comparison.

- [x] Freeze v1 tables — `reject_v1_writes()` trigger on all 4 v1 tables (`documents`, `blocks`, `annotation_runs`, `block_annotations`). Any INSERT/UPDATE/DELETE raises exception.
- [x] Verify all Edge Functions write exclusively to v2 — confirmed: ingest (v8), conversion-complete (v4), runs (v6), export-jsonl (v8) all target v2 tables
- [x] Verify all smoke tests updated for v2 — all 4 scripts validate v2 shape, field names, block_type enum
- [x] Remove v1 cron job (`stale_conversion_cleanup`) — nothing writes to v1 `documents` anymore
- [x] Drop v1 RPC `create_annotation_run` — resolves last DB security advisory (search_path mutable)
- [ ] Decide retention period for v1 data (can DROP v1 tables whenever ready — data is duplicated in v2)

**Migration file:** `supabase/migrations/20260208033331_005_v2_cutover_freeze_v1.sql`

### Option B: Full rename cutover (not chosen)

Would rename v1 → `*_legacy`, v2 → canonical names. Deferred — cosmetic benefit does not justify the rename surgery risk.

---

## Security Advisories (pre-existing, resolve during migration)

| Advisory | Table/Function | Fix | Status |
|---|---|---|---|
| `function_search_path_mutable` | `set_updated_at` | Add `SET search_path = ''` | Fixed (migration 004) |
| `function_search_path_mutable` | `create_annotation_run` | Drop function (superseded by `create_run_v2`) | Fixed (migration 005) |
| `auth_leaked_password_protection` | Auth config | Enable leaked password protection in Supabase Auth settings | Pending (dashboard) |

- [x] Fix `set_updated_at` search_path (applied in migration 004)
- [x] Ensure `create_run_v2` is created with `SET search_path = ''` (applied in migration 004)
- [x] Drop `create_annotation_run` (applied in migration 005 — resolves advisory)
- [ ] Enable leaked password protection (Supabase Auth dashboard setting — not a DB change)

---

## Execution Order (all complete)

```
Step 1 (lock v2 contract)           ✓
  ↓
Step 2 (sync repo migrations)       ✓
  ↓
Step 3 (create runs_v2 + overlays)  ✓
  ↓
Step 4 (create_run_v2 RPC)          ✓
  ↓
Step 5 (RLS policies)               ✓
  ↓
Step 6 (pg_cron for documents_v2)   ✓
  ↓
Step 7 (Edge Function cutover)      ✓
  ↓
Step 8 (smoke test updates)         ✓
  ↓
Step 9 (freeze v1, Option A)        ✓
```
