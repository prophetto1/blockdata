# BD Reference Schema + Dual-Engine Backend

## Context

AIs keep breaking the database when trying to adapt Kestra tables for our app. Root cause: no hard boundary between Kestra reference data and our operational data. Every attempt to "convert" or "adapt" Kestra tables in place introduces drift and breaks things.

This plan creates that boundary: a separate read-only reference schema containing all 21 Kestra tables, structurally exact, alongside our existing app tables in `public.*`.

## Two-phase approach

**Phase 1 (this plan):** Import Kestra tables as-is into a protected reference schema. Prove the full path works: DB → Python handlers → frontend. No renaming.

**Phase 2 (future, after Phase 1 is proven):** Unilateral rename of `kestra` → `bd` everywhere — schema, enum values, class paths, filenames, docs, everything. This only happens after the system is connected and operational end-to-end.

---

## Phase 1: Reference Schema

### Step 1: Create `kestra_ref` schema migration

**New file:** `supabase/migrations/20260308120000_072_kestra_ref_schema.sql`

Source: `docs-approved/backend setup/kestra-sqls/kestra_schema.sql`

Import the full schema unmodified into a dedicated namespace:

```sql
CREATE SCHEMA IF NOT EXISTS kestra_ref;
SET search_path TO kestra_ref;

COMMENT ON SCHEMA kestra_ref IS
  'Read-only reference copy of Kestra 21-table schema. '
  'DO NOT MODIFY. Source: docs-approved/backend setup/kestra-sqls/kestra_schema.sql. '
  'Will be renamed to bd_ref after full system integration is proven.';
```

Then paste the full contents of `kestra_schema.sql` — all of:
- 3 enums: `log_level`, `queue_type`, `state_type`
- 9 functions: `fulltext_replace`, `fulltext_index`, `fulltext_search`, `parse_iso8601_datetime`, `parse_iso8601_duration`, `parse_iso8601_timestamp`, `loglevel_fromtext`, `state_fromtext`, `update_updated_datetime`
- 21 tables (all using JSONB + generated columns pattern):
  1. `concurrency_limit`
  2. `dashboards`
  3. `execution_queued`
  4. `executions`
  5. `executordelayed`
  6. `executorstate`
  7. `flow_topologies`
  8. `flows`
  9. `flyway_schema_history`
  10. `kv_metadata`
  11. `logs`
  12. `metrics`
  13. `multipleconditions`
  14. `namespace_file_metadata`
  15. `queues`
  16. `service_instance`
  17. `settings`
  18. `sla_monitor`
  19. `templates`
  20. `triggers`
  21. `worker_job_running`
- 62 indexes (45 BTREE, 8 GIN, 1 HASH, 1 UNIQUE, plus filtered)
- 4 triggers

**Rule: no DDL/schema modifications.** No added columns, no changed types, no tenant columns, no RLS on reference tables. The table structures, indexes, constraints, enums, and generated columns stay exact.

**Allowed modifications:** Ports, connection strings, config values, API URLs, auth credentials, environment variables, and any other operational wiring needed to make the system run in our infrastructure. If it doesn't change a CREATE TABLE, ALTER TABLE, CREATE INDEX, or CREATE TYPE statement, it's fine.

### Step 2: Lock down permissions

```sql
-- Read-only for service_role (Python handlers use this)
GRANT USAGE ON SCHEMA kestra_ref TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA kestra_ref TO service_role;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA kestra_ref FROM service_role;

-- Invisible to API users
REVOKE ALL ON SCHEMA kestra_ref FROM anon, authenticated;
```

**Critical rules:**
- Only `postgres` role can write (for data loading)
- `service_role` can read only
- Schema is NOT added to `supabase/config.toml` API schemas — stays invisible to PostgREST
- No app code, no AI, no migration ever writes to `kestra_ref`
- **DDL is frozen** — no ALTER TABLE, no added columns, no changed types
- **Operational config is open** — ports, connection strings, API URLs, env vars, auth config can all be changed to fit our infrastructure

### Step 3: Existing app tables stay unchanged

Already in `public.*`:
- `flow_sources` (migration 049/069) — flow definitions with revision history
- `flow_executions` (migration 070) — execution records
- `flow_logs` (migration 071) — log entries

These are the operational write targets. Python handlers read from `kestra_ref.*`, write to `public.*`.

### Step 4: Data loading

Load reference data into `kestra_ref` from the live Kestra instance (192.168.0.168:8088) via one of:
- `pg_dump` from Kestra's Postgres → `pg_restore` into `kestra_ref`
- Direct SQL INSERT via `postgres` role
- Kestra API export → SQL import script

This is a one-time or periodic sync, not a live replication.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase Postgres                     │
│                                                         │
│  ┌─────────────────┐         ┌────────────────────┐    │
│  │  kestra_ref.*    │         │  public.*           │    │
│  │  (READ-ONLY)     │         │  (READ-WRITE)       │    │
│  │                  │         │                     │    │
│  │  21 exact Kestra │  READ   │  flow_sources       │    │
│  │  tables, no mods │ ──────► │  flow_executions    │    │
│  │                  │         │  flow_logs           │    │
│  │                  │         │  (+ future tables)   │    │
│  └─────────────────┘         └──────────┬──────────┘    │
│                                         │               │
└─────────────────────────────────────────┼───────────────┘
                                          │
                              ┌───────────┼───────────┐
                              │                       │
                   ┌──────────▼──────────┐ ┌─────────▼─────────┐
                   │  Python Handlers     │ │  Kestra Java API   │
                   │  (PRIMARY)           │ │  (FALLBACK)        │
                   │  Translated from     │ │  192.168.0.168:8088│
                   │  Kestra Java sources │ │  Available when no │
                   │                      │ │  Python handler    │
                   └──────────────────────┘ └────────────────────┘
```

**Data flow:**
- Python handlers READ from `kestra_ref.*` for contracts, schemas, plugin definitions
- Python handlers WRITE to `public.*` for operational data (executions, logs, etc.)
- Kestra Java API is available as fallback when a Python handler doesn't exist yet
- Frontend reads from `public.*` via Supabase API (with RLS)

---

## What the reference schema gives us

1. **AIs stop breaking things** — `kestra_ref` is untouchable, `public.*` has a clear contract
2. **Python handlers have exact Kestra contracts to read** — no guessing, no drift
3. **Java fallback works** — Kestra instance reads/writes its own DB, we can query its API
4. **Future rename is mechanical** — once everything works, `kestra` → `bd` is a scripted find-replace across 7 categories (source tree, Java types, runtime/config, API/frontend, SQL, plugins, docs)

---

## Phase 2: Rename (future, after system is proven operational)

Only after the full path DB → backend → frontend is working:

- `kestra_ref` → `bd_ref` (or `bd_raw`)
- `kestra` → `bd` everywhere: schema, enums, class paths (`io.kestra.*` → `io.bd.*`), filenames, docs, config, env vars
- Deterministic, scripted, category-by-category — not gradual cleanup
- If escalation needed: promote reference schema to separate database

---

## Verification checklist

1. Apply migration → `kestra_ref` schema exists with 21 tables
2. `SELECT table_name FROM information_schema.tables WHERE table_schema = 'kestra_ref';` → 21 rows
3. `kestra_ref` not visible in PostgREST API
4. `service_role` can SELECT from `kestra_ref.*` but cannot INSERT/UPDATE/DELETE
5. `public.*` flow tables unaffected
6. Python handler can read a flow definition from `kestra_ref.flows` and write an execution to `public.flow_executions`

---

## Critical files

| Purpose | Path |
|---------|------|
| Source schema (exact) | `docs-approved/backend setup/kestra-sqls/kestra_schema.sql` |
| Table listing | `docs-approved/backend setup/kestra-sqls/tables.txt` |
| Column details | `docs-approved/backend setup/kestra-sqls/columns.tsv` |
| Table definitions | `docs-approved/backend setup/kestra-sqls/kestra_table_definitions.sql` |
| Required table analysis | `docs-approved/backend setup/jon/2026-03-07-kestra-required-table-inventory.md` |
| Schema analysis | `docs-approved/backend setup/jon/kestra-schema-analysis.md` |
| Docs site summary | `web-docs/src/content/docs/internal/analysis/kestra/sql-tables.md` |
| Backend direction | `web-docs/src/content/docs/kestra-integration/backend-direction.md` |
| New migration (to create) | `supabase/migrations/20260308120000_072_kestra_ref_schema.sql` |
| Config (no changes) | `supabase/config.toml` |
| Existing app migrations | `supabase/migrations/20260305*_069/070/071_*.sql` |
