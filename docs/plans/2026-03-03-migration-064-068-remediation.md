# Migration 064–068 Remediation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply migrations 064–068 to the live Supabase DB, fixing all issues that would cause failures.

**Architecture:** Five migrations need to land in order. 064 creates satellite tables. 065 is mostly already applied (columns exist) but still needed for the `function_type` CHECK constraint and view refresh. 066 is broken — wrong `service_id`, wrong function names, duplicate data — and needs a full rewrite. 067 is redundant. 068 depends on 064's tables existing.

**Tech Stack:** Supabase (PostgreSQL 17), SQL migrations, `apply_migration` MCP tool

---

## Verified DB State (2026-03-03)

| Fact | Value |
|------|-------|
| Last applied migration | `063_eyecite_reference_data_functions` |
| Live pipeline-worker service_id | `f0de8127-58de-49e6-aa0e-6b5cc3a164d8` |
| Old pipeline-worker ID `00000000-...-100` | **Does not exist** (deleted) |
| Pipeline-worker functions | 28 (auto-generated UUIDs, names like `io_kestra_plugin_core_flow_If`) |
| 065 columns on service_registry | Already present (description, auth_type, auth_config, docs_url) |
| 065 columns on service_functions | Already present (all 14 new columns) |
| `function_type` CHECK constraint | Missing `'flow'` — only allows through `'callback'` |
| `service_functions_view` | Exists (may be stale — missing new columns) |
| `kestra_provider_enrichment` table | Does not exist |
| `kestra_plugin_inputs` table | Does not exist |
| `integration_catalog_items` count | 945 (all present) |
| `mapped_service_id` / `mapped_function_id` columns | Exist on integration_catalog_items |

### Existing pipeline-worker functions (28 total)

Two naming generations coexist:

**Legacy (`io.kestra.core.tasks.*`)** — 12 functions:
- `io_kestra_core_tasks_flows_{EachParallel,EachSequential,If,Parallel,Pause,Sequential,Sleep,Switch}`
- `io_kestra_core_tasks_http_{Download,Request}`
- `io_kestra_core_tasks_log_Log`
- `io_kestra_core_tasks_scripts_Bash`

**Modern (`io.kestra.plugin.*`)** — 16 functions:
- `io_kestra_plugin_core_flow_{ForEach,If,Parallel,Pause,Sequential,Sleep,Switch}`
- `io_kestra_plugin_core_http_{Download,Request}`
- `io_kestra_plugin_core_log_Log`
- `io_kestra_plugin_scripts_python_{Commands,Script}`
- `io_kestra_plugin_scripts_node_{Commands,Script}`
- `io_kestra_plugin_scripts_shell_{Commands,Script}`

All 28 have: `function_type='utility'`, auto-generated UUIDs, sparse `parameter_schema` (0-2 params), no `when_to_use`, no `label` (uses function_name), no `deprecated` flags, `plugin_group` set at sub-package level (e.g. `io.kestra.plugin.core.flow`).

---

## Issues per Migration

### Migration 064 — Create satellite tables
**Status:** Not applied. No issues. Apply as-is.

### Migration 065 — Schema extensions
**Status:** Columns already exist. Constraint needs `'flow'` added. View needs refresh. Pipeline-worker type update is a no-op (already changed). Apply as-is — all DDL is idempotent.

### Migration 066 — Pipeline worker functions (**BROKEN — 4 issues**)

1. **Wrong service_id:** 38 references to `00000000-...-100` which doesn't exist. FK violation on INSERT. Must use `f0de8127-58de-49e6-aa0e-6b5cc3a164d8`.

2. **Naming collision:** 066 uses short names like `flow_if`, `http_request`. The DB already has `io_kestra_plugin_core_flow_If` under the same service_id. `ON CONFLICT (service_id, function_name)` won't match because the names differ — so 066 would INSERT duplicates, not UPDATE.

3. **Legacy function_id `00000000-...-101`:** 066 tries to UPDATE `function_id = '00000000-...-101'` to set deprecated. That ID doesn't exist.

4. **Integration catalog mapping UPDATEs:** Reference function IDs `00000000-...-102` through `...-120` which won't exist after the fix.

**Fix strategy:** Rewrite 066 to:
- Target correct service_id `f0de8127-...`
- UPDATE existing 28 functions (match on `source_task_class`) with richer metadata (labels, descriptions, parameter_schema, when_to_use, deprecated flags, correct function_type)
- Mark legacy `io.kestra.core.tasks.*` duplicates as deprecated
- Map integration_catalog_items to the real function_ids via `source_task_class` join

### Migration 067 — Integration catalog seed
**Status:** Redundant. All 945 items already present. Safe to apply (ON CONFLICT upsert). Can skip or apply — no harm either way.

### Migration 068 — Satellite table seed
**Status:** Will fail without 064. With 064 applied first, it works. The TRUNCATE + INSERT pattern is fine for a fresh seed. 44,731 lines of data from `e:/kestra-apis/output/`.

---

## Execution Plan

### Task 1: Apply migration 064 (satellite table creation)

**Files:** `supabase/migrations/20260303100000_064_kestra_plugin_catalog_tables.sql`

**Step 1: Apply via Supabase MCP**

Use `apply_migration` with the full SQL from the local file. Creates 5 tables:
- `kestra_plugin_inputs` (~9700 rows expected)
- `kestra_plugin_outputs` (~2300 rows)
- `kestra_plugin_examples` (~1451 rows)
- `kestra_plugin_definitions` (~4400 rows)
- `kestra_provider_enrichment` (~56 rows)

Plus RLS policies and grants.

**Step 2: Verify**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'kestra_%'
ORDER BY table_name;
```

Expected: 5 tables listed.

---

### Task 2: Apply migration 065 (schema extensions)

**Files:** `supabase/migrations/20260303110000_065_service_schema_extensions.sql`

**Step 1: Apply via Supabase MCP**

Apply as-is. All `ADD COLUMN IF NOT EXISTS` will no-op. The CHECK constraint will be dropped and recreated with `'flow'` added. The view will be refreshed with new columns. The pipeline-worker type UPDATE will match 0 rows (already done).

**Step 2: Verify**

```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'public.service_functions'::regclass
AND conname = 'service_functions_function_type_check';
```

Expected: CHECK list includes `'flow'`.

---

### Task 3: Rewrite and apply migration 066 (pipeline worker functions)

**Files:** Create new `supabase/migrations/20260303120000_066_pipeline_worker_functions.sql`

**Step 1: Rewrite the migration**

The rewritten 066 must:

a) **UPDATE modern functions** (16) with richer metadata from the original 066 INSERT values, matching on `source_task_class`:

| 066 name | DB source_task_class | Action |
|----------|---------------------|--------|
| `log_log` | `io.kestra.plugin.core.log.Log` | UPDATE: label, description, parameter_schema, when_to_use, function_type='utility' |
| `flow_sleep` | `io.kestra.plugin.core.flow.Sleep` | UPDATE: set function_type='flow', full params |
| `flow_pause` | `io.kestra.plugin.core.flow.Pause` | UPDATE: set function_type='flow', full params |
| `flow_if` | `io.kestra.plugin.core.flow.If` | UPDATE: set function_type='flow', full params |
| `flow_switch` | `io.kestra.plugin.core.flow.Switch` | UPDATE: set function_type='flow', full params |
| `flow_foreach` | `io.kestra.plugin.core.flow.ForEach` | UPDATE: set function_type='flow', full params |
| `flow_parallel` | `io.kestra.plugin.core.flow.Parallel` | UPDATE: set function_type='flow', full params |
| `flow_sequential` | `io.kestra.plugin.core.flow.Sequential` | UPDATE: set function_type='flow', full params |
| `http_request` | `io.kestra.plugin.core.http.Request` | UPDATE: full params |
| `http_download` | `io.kestra.plugin.core.http.Download` | UPDATE: full params |
| `python_script` | `io.kestra.plugin.scripts.python.Script` | UPDATE: full params |
| `python_commands` | `io.kestra.plugin.scripts.python.Commands` | UPDATE: full params |
| `shell_script` | `io.kestra.plugin.scripts.shell.Script` | UPDATE: full params |
| `shell_commands` | `io.kestra.plugin.scripts.shell.Commands` | UPDATE: full params |
| `node_script` | `io.kestra.plugin.scripts.node.Script` | UPDATE: full params |
| `node_commands` | `io.kestra.plugin.scripts.node.Commands` | UPDATE: full params |

b) **Mark legacy duplicates as deprecated** (12):

```sql
UPDATE public.service_functions SET
  deprecated = true,
  description = '[Deprecated] Legacy class path — use modern equivalent.',
  updated_at = now()
WHERE service_id = 'f0de8127-58de-49e6-aa0e-6b5cc3a164d8'
  AND source_task_class LIKE 'io.kestra.core.tasks.%';
```

c) **Map integration_catalog_items** using a JOIN on `source_task_class`:

```sql
UPDATE public.integration_catalog_items ici SET
  mapped_service_id  = sf.service_id,
  mapped_function_id = sf.function_id,
  mapping_notes      = 'auto-mapped via source_task_class'
FROM public.service_functions sf
WHERE sf.source_task_class = ici.task_class
  AND sf.service_id = 'f0de8127-58de-49e6-aa0e-6b5cc3a164d8'
  AND sf.deprecated = false;
```

**Step 2: Apply the rewritten SQL via Supabase MCP**

**Step 3: Verify**

```sql
-- Check flow types applied
SELECT function_name, function_type, deprecated
FROM public.service_functions
WHERE service_id = 'f0de8127-58de-49e6-aa0e-6b5cc3a164d8'
ORDER BY deprecated, function_name;

-- Check catalog mappings
SELECT COUNT(*) FROM public.integration_catalog_items
WHERE mapped_function_id IS NOT NULL;
```

---

### Task 4: Skip migration 067 (redundant)

All 945 integration_catalog_items already exist. Record it as applied with a no-op comment to keep migration numbering consistent.

```sql
-- Migration 067: no-op (integration catalog already seeded via earlier migrations)
SELECT 1;
```

---

### Task 5: Apply migration 068 (satellite seed data)

**Files:** `supabase/migrations/20260303140000_068_kestra_plugin_satellite_seed.sql`

**Step 1: Apply via Supabase MCP**

This is 44,731 lines. It TRUNCATE + INSERTs into:
- `kestra_provider_enrichment` (56 rows)
- `kestra_plugin_inputs` (9,698 rows)

Note: 068 only seeds 2 of the 5 satellite tables. The remaining 3 (`kestra_plugin_outputs`, `kestra_plugin_examples`, `kestra_plugin_definitions`) have JSONL source data at `e:/kestra-apis/output/` but no migration file yet. These can be a follow-up migration 069.

**Step 2: Verify**

```sql
SELECT 'kestra_provider_enrichment' as t, COUNT(*) FROM public.kestra_provider_enrichment
UNION ALL
SELECT 'kestra_plugin_inputs', COUNT(*) FROM public.kestra_plugin_inputs;
```

Expected: 56 providers, ~9698 inputs.

---

### Task 6: Fix Vercel build (ServicesPanelStatic.tsx)

Separate from migrations but blocking deployment. Options:
- Delete `ServicesPanelStatic.tsx` (mock data replaced by live DB)
- Or add missing fields to mock objects

This is a code fix, not a migration. Handle after DB migrations land.

---

## Dependency Graph

```
064 (create tables) ──→ 068 (seed satellite data)
065 (add 'flow' to CHECK) ──→ 066 (uses function_type='flow')
066 (rewritten) depends on correct service_id existing (already true)
067 (skip/no-op)
```

Apply order: **064 → 065 → 066 (rewritten) → 067 (no-op) → 068**

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| 065 constraint drop fails if name differs | Migration uses `DROP CONSTRAINT IF EXISTS` |
| 066 UPDATE matches 0 rows (task_class mismatch) | Verify exact `source_task_class` values before running |
| 068 too large for single MCP call | May need to split into provider_enrichment + plugin_inputs separately |
| Realtime subscriptions fire during migration | Expected — UI auto-refreshes, no data loss |