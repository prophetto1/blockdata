# Migration Reconciliation: Remote Supabase vs Local Files

**Date:** 2026-03-15
**Project:** block-annotation (`dbdzzhshmigewyprahej`)
**Remote last migration:** `20260313165216` / `085_conversion_parsing_unique_source_uid`
**Local last migration:** `20260314180000` / `091_extraction_tables`

---

## Root Cause

Migrations were applied to the remote Supabase DB through a different path (likely direct SQL or `supabase db push` with ad-hoc filenames) using different names and timestamps than the local migration files. The remote `schema_migrations` table diverged from the local `supabase/migrations/` directory after approximately migration `_075`.

The remote has 5 migrations from `20260310` onward with names that don't match any local file:

| Remote version | Remote name | Local equivalent |
|---|---|---|
| `20260310093657` | `parsing_pipeline_config` | `20260310120000_075_parsing_pipeline_config.sql` (different timestamp) |
| `20260310093711` | `parsing_profiles_rls` | No direct local file — RLS was embedded in local `_075_` |
| `20260313063635` | `document_delete_reset_rpcs` | `20260312190000_078_document_delete_reset_rpcs.sql` (different timestamp) |
| `20260313115300` | `view_documents_add_pipeline_config` | `20260314000000_084_view_documents_add_pipeline_config.sql` (different timestamp) |
| `20260313165216` | `085_conversion_parsing_unique_source_uid` | No local file — remote-only migration |

---

## Full Reconciliation Map

Each local migration from `_075` to `_091` was verified against the remote DB by querying for the specific objects, columns, constraints, policies, or data it creates or modifies.

### Already applied in substance — verified by object/value inspection

12 of the 13 local migrations from `_075` to `_087` are already applied on the remote (`_085_` is the exception — see "Not applied" below). Every verification is based on direct DB queries, not behavior inference.

| Local file | What it does | Verification method | Verified result |
|---|---|---|---|
| `_075_parsing_pipeline_config` | `pipeline_config` column + `parsing_profiles` table + seed 4 docling profiles | `information_schema.columns` for `pipeline_config`; `information_schema.tables` for `parsing_profiles` | Both exist |
| `_076_pandoc_parsing_profiles` | Seed 8 pandoc profiles | `SELECT ... FROM parsing_profiles WHERE parser='pandoc'` | Pandoc profiles exist |
| `_077_route_md_through_docling` | Route md/txt/markdown to docling in `admin_runtime_policy` | `SELECT value_jsonb->>'md', ->>'txt', ->>'markdown' FROM admin_runtime_policy WHERE policy_key='upload.extension_track_routing'` | All three route to `docling` |
| `_078_document_delete_reset_rpcs` | `delete_source_document()` and `reset_source_document()` RPCs | `pg_proc` lookup for both function names | Both exist |
| `_079_storage_allow_all_artifact_locators` | Expand storage SELECT policy to include `conversion_representations.artifact_locator` paths | `pg_policies` for `storage.objects` — inspected `storage_objects_documents_select_owned` policy body | Policy body includes `conversion_representations.artifact_locator` join path |
| `_080_fix_reset_delete_rpcs_table_names` | Fix table refs from `_v2` to current names in delete/reset RPCs | `pg_proc.prosrc` for `delete_source_document` | References `block_overlays` and `runs` (not `_v2` names) |
| `_081_docling_only_parsing` | Delete non-docling data, constrain `conversion_representations`, update routing | `pg_constraint` for `conversion_representations_pairing` CHECK; `conversion_parsing` GROUP BY `conv_parsing_tool`; `admin_runtime_policy` `track_enabled` | Constraint exists (`parsing_tool = 'docling'`), only docling data remains, `track_enabled = {"docling": true}` |
| `_082_consolidate_delete_rpcs_add_view` | Rewrite `delete_project()`, create `view_documents` | `pg_proc` for `delete_project`; `information_schema.views` for `view_documents` | Both exist |
| `_083_rename_ingested_to_parsed` | Rename status `ingested` → `parsed`, `ingest_failed` → `parse_failed` | `SELECT DISTINCT status FROM source_documents` | `parsed` and `parse_failed` present, no `ingested` or `ingest_failed` |
| `_084_view_documents_add_pipeline_config` | Add `pipeline_config` to `view_documents` | `pg_get_viewdef('view_documents')` | `pipeline_config` column present in view definition |
| `_085_docling_blocks_view_mode_policy` | Insert `platform.docling_blocks_mode` policy | `SELECT ... FROM admin_runtime_policy WHERE policy_key='platform.docling_blocks_mode'` | **NOT applied** — listed under "Not applied" below |
| `_086_registry_source_types_add_binary` | Insert `binary` into `registry_source_types` | `SELECT ... FROM registry_source_types WHERE source_type='binary'` | Exists |
| `_087_upload_support_all_remove_upload_gates` | Remove MIME allowlist, delete `upload.allowed_extensions` policy | `SELECT ... FROM admin_runtime_policy WHERE policy_key='upload.allowed_extensions'` | Policy does not exist (correctly removed) |

**Correction from original analysis:** `_079_` and `_081_` were originally listed as "not applied" based on incomplete checks (searching for policy name substring instead of inspecting policy body; searching for constraint by name pattern instead of by table). Both are fully applied.

### Not applied — must be applied

Only 5 local migrations need to be applied to the remote:

| Local file | What it does | Verification |
|---|---|---|
| `_085_docling_blocks_view_mode_policy` | Inserts `platform.docling_blocks_mode` into `admin_runtime_policy` | Policy key does not exist in `admin_runtime_policy` |
| **`_088_parse_runtime_audit`** | Adds `requested_pipeline_config`, `applied_pipeline_config`, `parser_runtime_meta` to `conversion_parsing`; rebuilds `view_documents` | None of the 3 columns exist on `conversion_parsing` |
| `_089_add_cleanup_outbox` | Creates `cleanup_outbox` table | Table does not exist |
| `_090_add_overlay_uid` | Adds `overlay_uid` column to `block_overlays` | Column does not exist |
| **`_091_extraction_tables`** | Creates `extraction_schemas`, `extraction_jobs`, `extraction_job_items`, `extraction_results`, `claim_extraction_items` RPC with REVOKE/GRANT | None of these tables/functions exist |

### Remote-only — no local file

| Remote version | Remote name | What it does | Action |
|---|---|---|---|
| `20260310093711` | `parsing_profiles_rls` | Adds RLS policies to `parsing_profiles` (embedded in local `_075_`) | No action — already covered by local `_075_` content |
| `20260313165216` | `085_conversion_parsing_unique_source_uid` | Adds unique constraint on `conversion_parsing.source_uid` | **Create a local stub file** to record this migration exists (Phase A) |

---

## Reconciliation Plan — Phased Approach

### Phase A: Record local history and align migration tracking (writes to `schema_migrations`)

1. Create a local stub migration file for the remote-only `085_conversion_parsing_unique_source_uid` so the local directory acknowledges it exists. The file should contain a comment explaining it was applied remotely and the stub is for history alignment only.

2. Register local migrations `_075` through `_084`, `_086`, and `_087` in `schema_migrations` — these are verified as fully applied in substance. Each was confirmed by direct object/value inspection (see table above), not by behavior inference. This is a DB write to `supabase_migrations.schema_migrations`.

   Do NOT register `_085`, `_088`, `_089`, `_090`, or `_091` — they are not yet applied.

### Phase B: Apply additive, low-risk missing migrations

Apply these 4 migrations. All are low-risk and idempotent. `_085` and `_089` are purely additive (new row, new table). `_088` modifies an existing view (`CREATE OR REPLACE VIEW`) and adds columns to an existing table. `_090` adds a column to an existing table (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). None delete data.

1. **`_085_docling_blocks_view_mode_policy`** — single INSERT with ON CONFLICT DO NOTHING

   ```sql
   INSERT INTO public.admin_runtime_policy (policy_key, value_jsonb, value_type, description)
   VALUES (
     'platform.docling_blocks_mode',
     '"normalized"'::jsonb,
     'string',
     'Controls whether the Parse Blocks tab shows normalized Blockdata blocks or raw Docling-native items.'
   )
   ON CONFLICT (policy_key) DO NOTHING;
   ```

2. **`_088_parse_runtime_audit`** — ADD COLUMN IF NOT EXISTS, backfill, view rebuild
3. **`_089_add_cleanup_outbox`** — CREATE TABLE IF NOT EXISTS
4. **`_090_add_overlay_uid`** — ADD COLUMN IF NOT EXISTS

### Phase C: Apply extraction tables migration

5. **`_091_extraction_tables`** — 4 new tables, RPC, REVOKE/GRANT, Realtime publication. All CREATE IF NOT EXISTS. No interaction with existing data.

### Phase D: Register applied migrations in history

After Phases B and C succeed, register all 5 newly-applied migrations in `schema_migrations` so the remote history matches the local directory.

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
  ('20260314010000', '085_docling_blocks_view_mode_policy'),
  ('20260314140000', '088_parse_runtime_audit'),
  ('20260314160000', '089_add_cleanup_outbox'),
  ('20260314170000', '090_add_overlay_uid'),
  ('20260314180000', '091_extraction_tables')
ON CONFLICT (version) DO NOTHING;
```

---

## Preventing Recurrence

### Why this happened

1. **No single migration path was enforced.** Migrations were applied via direct SQL or `db push` with different filenames than the local files.
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

Adopt this rule immediately:

> **All DDL changes must be authored as local migration files and applied via `supabase db push` or the `apply_migration` MCP tool. No direct SQL for schema changes. No dashboard schema editor.**
