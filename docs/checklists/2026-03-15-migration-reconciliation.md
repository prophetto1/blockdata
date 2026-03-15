# Migration Reconciliation: Remote Supabase vs Local Files

**Date:** 2026-03-15
**Project:** block-annotation (`dbdzzhshmigewyprahej`)
**Remote last migration:** `20260313165216` / `085_conversion_parsing_unique_source_uid`
**Local last migration:** `20260314180000` / `091_extraction_tables`

---

## Root Cause

Migrations were applied to the remote Supabase DB through a different path (likely `supabase db push`, direct SQL, or the dashboard) with different filenames and timestamps than the local migration files. The remote `schema_migrations` table tracks what was applied remotely, but the local files diverged independently after approximately migration `_075`.

The remote has 5 migrations from `20260310` onward with names that don't match any local file:

| Remote version | Remote name | Local equivalent |
|---|---|---|
| `20260310093657` | `parsing_pipeline_config` | `20260310120000_075_parsing_pipeline_config.sql` (different timestamp) |
| `20260310093711` | `parsing_profiles_rls` | No direct local file — RLS was embedded in `_075_` locally |
| `20260313063635` | `document_delete_reset_rpcs` | `20260312190000_078_document_delete_reset_rpcs.sql` (different timestamp) |
| `20260313115300` | `view_documents_add_pipeline_config` | `20260314000000_084_view_documents_add_pipeline_config.sql` (different timestamp) |
| `20260313165216` | `085_conversion_parsing_unique_source_uid` | No local file — this migration only exists on remote |

---

## Full Reconciliation Map

Each local migration from `_075` to `_091` was checked against the remote DB state by querying for the objects it creates or modifies.

### Already applied in substance (skip)

These local migrations create objects that already exist on the remote. They were applied through the divergent remote path.

| Local file | What it does | How we verified |
|---|---|---|
| `_075_parsing_pipeline_config` | `pipeline_config` column + `parsing_profiles` table + seed 4 docling profiles | `parsing_profiles` table exists, `pipeline_config` column on `conversion_parsing` exists |
| `_076_pandoc_parsing_profiles` | Seed 8 pandoc profiles into `parsing_profiles` | Pandoc profiles exist in `parsing_profiles` |
| `_077_route_md_through_docling` | Route md/txt to docling in `admin_runtime_policy` | Docling routing is live (verified via existing parse behavior) |
| `_078_document_delete_reset_rpcs` | `delete_source_document()` and `reset_source_document()` RPCs | Both RPCs exist in `pg_proc` |
| `_080_fix_reset_delete_rpcs_table_names` | Fix table refs in delete/reset RPCs | RPCs exist and reference correct tables (applied via remote `document_delete_reset_rpcs`) |
| `_082_consolidate_delete_rpcs_add_view` | Rewrite `delete_project()`, create `view_documents` | `view_documents` exists, `delete_project()` exists |
| `_083_rename_ingested_to_parsed` | Rename `ingested` → `parsed`, `ingest_failed` → `parse_failed` | `parsed` status exists in `source_documents` |
| `_084_view_documents_add_pipeline_config` | Add `pipeline_config` to `view_documents` | `view_documents` includes `pipeline_config` (verified via `pg_get_viewdef`) |
| `_086_registry_source_types_add_binary` | Insert `binary` into `registry_source_types` | `binary` source type exists |
| `_087_upload_support_all_remove_upload_gates` | Remove MIME allowlist, delete `upload.allowed_extensions` policy | `upload.allowed_extensions` policy does not exist |

### Not applied — must be applied

These local migrations create objects that do NOT exist on the remote.

| Local file | What it does | Verification |
|---|---|---|
| `_079_storage_allow_all_artifact_locators` | Expands storage SELECT RLS policy to allow access to all `conversion_representations.artifact_locator` paths | No artifact-locator storage policy found on remote |
| `_081_docling_only_parsing` | Deletes non-docling parsed data, constrains `conversion_representations` to docling-only, updates all `admin_runtime_policy` routing | No docling-only constraint found on `conversion_representations`. Data cleanup may already be done, but the constraint is missing. |
| `_085_docling_blocks_view_mode_policy` | Inserts `platform.docling_blocks_mode` into `admin_runtime_policy` | Policy key does not exist in `admin_runtime_policy` |
| **`_088_parse_runtime_audit`** | Adds `requested_pipeline_config`, `applied_pipeline_config`, `parser_runtime_meta` to `conversion_parsing`; rebuilds `view_documents` | None of the 3 columns exist on remote |
| `_089_add_cleanup_outbox` | Creates `cleanup_outbox` table | Table does not exist |
| `_090_add_overlay_uid` | Adds `overlay_uid` column to `block_overlays` | Column does not exist |
| **`_091_extraction_tables`** | Creates `extraction_schemas`, `extraction_jobs`, `extraction_job_items`, `extraction_results`, `claim_extraction_items` RPC | None of these tables exist |

### Remote-only — no local file

| Remote version | Remote name | What it likely does |
|---|---|---|
| `20260310093711` | `parsing_profiles_rls` | Adds RLS policies to `parsing_profiles` (done inline in local `_075_`) |
| `20260313165216` | `085_conversion_parsing_unique_source_uid` | Adds unique constraint on `conversion_parsing.source_uid` (no local equivalent) |

---

## Recommended Fix: Idempotent Catch-Up Migration

Write one `_092_reconcile_catch_up.sql` that applies the 7 missing changes idempotently, then register skipped migrations in `schema_migrations` so remote and local histories agree going forward.

### Part 1: Apply missing objects

```sql
-- From _079: storage artifact locator policy
-- (Must inspect current policy and expand if needed)

-- From _081: docling-only constraint on conversion_representations
-- (Use IF NOT EXISTS / DO $$ guards)

-- From _085: docling_blocks_mode policy
INSERT INTO admin_runtime_policy (policy_key, policy_value)
VALUES ('platform.docling_blocks_mode', '"normalized"')
ON CONFLICT (policy_key) DO NOTHING;

-- From _088: parse runtime audit columns
ALTER TABLE public.conversion_parsing
  ADD COLUMN IF NOT EXISTS requested_pipeline_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS applied_pipeline_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS parser_runtime_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill
UPDATE public.conversion_parsing
SET
  requested_pipeline_config = COALESCE(pipeline_config, '{}'::jsonb),
  applied_pipeline_config = COALESCE(pipeline_config, '{}'::jsonb)
WHERE requested_pipeline_config = '{}'::jsonb
  AND pipeline_config IS NOT NULL
  AND pipeline_config != '{}'::jsonb;

-- Rebuild view_documents with new columns
CREATE OR REPLACE VIEW public.view_documents AS
SELECT
  sd.source_uid, sd.owner_id, sd.source_type, sd.source_filesize,
  sd.source_total_characters, sd.source_locator, sd.doc_title,
  sd.uploaded_at, sd.updated_at, sd.status, sd.error,
  sd.conversion_job_id, sd.project_id,
  cp.conv_uid, cp.conv_status, cp.conv_parsing_tool,
  cp.conv_representation_type, cp.conv_total_blocks,
  cp.conv_block_type_freq, cp.conv_total_characters, cp.conv_locator,
  cp.pipeline_config, cp.requested_pipeline_config,
  cp.applied_pipeline_config, cp.parser_runtime_meta
FROM public.source_documents sd
LEFT JOIN public.conversion_parsing cp ON cp.source_uid = sd.source_uid;

-- From _089: cleanup_outbox
-- (Full CREATE TABLE IF NOT EXISTS from the migration file)

-- From _090: overlay_uid
ALTER TABLE public.block_overlays
  ADD COLUMN IF NOT EXISTS overlay_uid uuid DEFAULT gen_random_uuid();

-- From _091: extraction tables
-- (Full content from 20260314180000_091_extraction_tables.sql, all IF NOT EXISTS)
```

### Part 2: Register skipped local migrations

After the catch-up migration applies, insert version records for all local migrations that were already applied in substance so `supabase migration list` shows them as applied:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
  ('20260310120000', '075_parsing_pipeline_config'),
  ('20260310130000', '076_pandoc_parsing_profiles'),
  ('20260312180000', '077_route_md_through_docling'),
  ('20260312190000', '078_document_delete_reset_rpcs'),
  ('20260313200000', '079_storage_allow_all_artifact_locators'),
  ('20260313210000', '080_fix_reset_delete_rpcs_table_names'),
  ('20260313220000', '081_docling_only_parsing'),
  ('20260313230000', '082_consolidate_delete_rpcs_add_view'),
  ('20260313240000', '083_rename_ingested_to_parsed'),
  ('20260314000000', '084_view_documents_add_pipeline_config'),
  ('20260314010000', '085_docling_blocks_view_mode_policy'),
  ('20260314120000', '086_registry_source_types_add_binary'),
  ('20260314130000', '087_upload_support_all_remove_upload_gates'),
  ('20260314140000', '088_parse_runtime_audit'),
  ('20260314160000', '089_add_cleanup_outbox'),
  ('20260314170000', '090_add_overlay_uid'),
  ('20260314180000', '091_extraction_tables')
ON CONFLICT (version) DO NOTHING;
```

---

## Preventing Recurrence

### Why this happened

1. **No single migration path was enforced.** Migrations were applied via direct SQL, dashboard, or `db push` with different filenames than the local files.
2. **No CI gate** checks that `supabase migration list` matches local files before deploy.
3. **No naming convention** was enforced — remote migrations used short names (`parsing_pipeline_config`) while local files used numbered names (`_075_parsing_pipeline_config`).

### Recommended safeguards

| Safeguard | Effort | Impact |
|---|---|---|
| **Single migration path rule:** All schema changes go through local migration files and `supabase db push` or `apply_migration`. No direct SQL for DDL. | Process | Prevents the root cause |
| **CI migration drift check:** Run `supabase migration list --db-url <remote>` in CI and fail if any local migration is not applied or if remote has unknown migrations. | Small | Catches drift before deploy |
| **Naming convention:** All migration files must follow `YYYYMMDDHHMMSS_NNN_descriptive_name.sql`. The `NNN` sequence must be monotonic. | Process | Prevents numbering collisions |
| **Pre-push hook:** Before `git push`, verify that local migration files haven't been renamed or reordered relative to what's in `schema_migrations`. | Medium | Catches local drift |
| **Migration apply as part of edge function deploy:** Deploy script runs `supabase db push` before `supabase functions deploy`. | Small | Ensures schema and functions stay in sync |

### Minimum viable safeguard

At minimum, adopt this rule immediately:

> **All DDL changes must be authored as local migration files and applied via `supabase db push` or the `apply_migration` MCP tool. No direct SQL for schema changes. No dashboard schema editor.**

This single rule, if followed, would have prevented the entire divergence.

---

## Open Questions

1. **`085_conversion_parsing_unique_source_uid`** exists on the remote but has no local file. Should we create a local stub migration to record it, or is the unique constraint already implied by the `ON CONFLICT source_uid` upsert pattern?

2. **`_079_storage_allow_all_artifact_locators`** and **`_081_docling_only_parsing`** need careful review before applying — they modify storage policies and delete data. Should these be applied as-is or rewritten for the current remote state?

3. **Should we keep the divergent remote migration records** (`parsing_pipeline_config`, `parsing_profiles_rls`, `document_delete_reset_rpcs`, `view_documents_add_pipeline_config`, `085_conversion_parsing_unique_source_uid`) in `schema_migrations`, or clean them up to match local naming?
