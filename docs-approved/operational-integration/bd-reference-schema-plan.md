# BD Operational Integration Plan

## Context

AIs keep breaking the database when trying to adapt Kestra tables. Root cause: no hard boundary between Kestra reference data and our operational data. This plan fixes that and covers the full integration stack: database, backend handlers, and frontend surfaces.

## Three-phase approach

**Phase 1:** Import Kestra's 21 tables as-is into a protected reference schema. No renaming.

**Phase 2:** Wire up the dual-engine backend (Python primary, Java fallback) and connect the frontend surfaces to live data.

**Phase 3 (future):** After everything is operational end-to-end, unilateral rename `kestra` → `bd` everywhere.

---

## Phase 1: Reference Schema

### Step 1: Create `kestra_ref` schema migration

**New file:** `supabase/migrations/20260308120000_072_kestra_ref_schema.sql`

**Source:** `docs-approved/backend setup/kestra-sqls/kestra_schema.sql`

```sql
CREATE SCHEMA IF NOT EXISTS kestra_ref;
SET search_path TO kestra_ref;

COMMENT ON SCHEMA kestra_ref IS
  'Read-only reference copy of Kestra 21-table schema. '
  'DO NOT MODIFY DDL. Source: docs-approved/backend setup/kestra-sqls/kestra_schema.sql. '
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
GRANT USAGE ON SCHEMA kestra_ref TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA kestra_ref TO service_role;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA kestra_ref FROM service_role;
REVOKE ALL ON SCHEMA kestra_ref FROM anon, authenticated;
```

**Critical rules:**
- Only `postgres` role can write (for data loading)
- `service_role` can read only
- Schema NOT added to `supabase/config.toml` API schemas — invisible to PostgREST
- No app code, no AI, no migration ever writes to `kestra_ref`
- **DDL is frozen** — no ALTER TABLE, no added columns, no changed types
- **Operational config is open** — ports, connection strings, API URLs, env vars, auth config can all change

### Step 3: Existing app tables stay unchanged

Already in `public.*`:
- `flow_sources` (migration 049/069) — flow definitions with revision history
- `flow_executions` (migration 070) — execution records
- `flow_logs` (migration 071) — log entries

These are the operational write targets.

### Step 4: Data loading

Load reference data into `kestra_ref` from the live Kestra instance (192.168.0.168:8088) via:
- `pg_dump` from Kestra's Postgres → `pg_restore` into `kestra_ref`
- Direct SQL INSERT via `postgres` role
- Kestra API export → SQL import script

One-time or periodic sync, not live replication.

---

## Phase 2: Dual-Engine Backend + Frontend Surfaces

### 2A: Python Handlers (Primary Engine)

**Location:** `services/pipeline-worker/`

**Current state:** FastAPI service with 14 of 821+ plugin types implemented:
- 8 core: Log, Sleep, Pause, If, Switch, ForEach, Parallel, Sequential
- 2 HTTP: Request, Download
- 3 script: Python, Shell, Node

**Endpoint:** `POST /execute` — accepts any `task_type`, dispatches to registered handler

**6 handler families identified for translation from Java:**

| Family | Java source pattern | Python target | Examples |
|--------|-------------------|---------------|----------|
| JDBC/Database | `AbstractConnection` + SQL | `sqlalchemy` / native drivers | PostgreSQL, MySQL, BigQuery, Snowflake, DuckDB |
| Cloud (AWS/GCP/Azure) | SDK calls with credentials | `boto3`, `google-cloud-*`, `azure-*` | S3, GCS, Azure Blob |
| Script | Run code in container | `subprocess` / direct exec | Python, Shell, Node, R |
| HTTP/Notification | POST payload to URL | `httpx` / `requests` | Slack, email, webhooks |
| Data Integration | Orchestrate CLI | `subprocess` + config render | dbt, Singer, dlt |
| AI/LLM | API calls with prompts | Provider SDKs | OpenAI, Anthropic |

**Java-to-Python type mappings:**
- `Property<String>` → `str`
- `Property<Integer>` → `int`
- `Property<Duration>` → `timedelta`
- `Property<Map<String,String>>` → `dict[str, str]`
- `Property<List<String>>` → `list[str]`
- `Property<URI>` → `str`

**Handler generation strategy:** Schema-driven codegen from Kestra's `GET /api/v1/plugins` endpoint → generate Python handler stubs automatically.

**Key files:**
- `services/pipeline-worker/app/main.py` — FastAPI app
- `services/pipeline-worker/app/registry.py` — task_type → handler mapping
- `services/pipeline-worker/app/plugins/core.py` — 8 core handlers
- `services/pipeline-worker/app/plugins/http.py` — HTTP handlers
- `services/pipeline-worker/app/plugins/scripts.py` — script handlers
- `services/pipeline-worker/app/shared/context.py` — ExecutionContext (replaces Kestra's RunContext)

**Reference docs:**
- `web-docs/src/content/docs/internal/analysis/kestra/python-handlers.md` — translation strategy
- `web-docs/src/content/docs/kestra-integration/pipeline-worker-plan.md` — service plan

### 2B: Java Handlers (Fallback Engine)

**This is a NEW requirement not in existing docs.** Current strategy says unmapped plugins stay unavailable. The new requirement: when no Python handler exists for a task type, fall back to Kestra's live Java API.

**Live Kestra instance:** `192.168.0.168:8088`
**Auth:** Basic (`admin@kestra.io:Kestra2026`)

**Fallback mechanism (to implement):**

```
1. Task comes in with task_type
2. Check pipeline-worker registry → Python handler exists?
   YES → execute via Python handler
   NO  → proxy to Kestra Java API:
         POST http://192.168.0.168:8088/api/v1/executions/{namespace}/{flowId}
         GET  http://192.168.0.168:8088/api/v1/executions/{executionId}
3. Write results to public.* regardless of which engine ran it
```

**Kestra API endpoints available for fallback:**
- `POST /api/v1/executions/{namespace}/{flowId}` — trigger execution
- `GET /api/v1/executions/{executionId}` — get execution status
- `GET /api/v1/logs/{executionId}` — get execution logs
- `GET /api/v1/flows/search` — search flows (already wired)
- `GET /api/v1/plugins` — plugin metadata catalog
- `GET /api/v1/plugins/schemas/{type}` — plugin schema

**Mapping infrastructure (exists):**
- `integration_catalog_items` — 945 plugin types catalogued
- `service_registry` — services that execute functions
- `service_functions` — functions mapped to services
- `resolve_task_endpoint()` SQL function — chains catalog → function → service

**Implementation priority for Python handlers (replaces Java fallback over time):**
1. Database family (50+ types) — PostgreSQL, MySQL, BigQuery, Snowflake, DuckDB
2. Cloud storage (30+ types) — S3, GCS, Azure Blob
3. Notifications (20+ types) — Slack, email, webhooks
4. Remaining families via schema-driven codegen

### 2C: Frontend Surfaces

**Stack:** React 19 + TypeScript + Tailwind 4 + Ark UI (NOT Kestra's Vue.js)

**Two-branch implementation plan** (from `2026-03-06-kestra-runtime-and-frontend-two-branch-plan.md`):

**Branch A — Runtime Foundation (backend):**
- A1: Flow runtime schema (enums, helpers)
- A2: Execution bridge & runtime writes
- A3: Plugin normalization & Python handler prep

**Branch B — Frontend Surfaces (UI on top of A):**
- B1: Flow list/detail/editor surfaces
- B2: Live integrations & admin mapping
- B3: Handler readiness & plugin docs browser

**Current frontend status:**

| Component | Status | Location |
|-----------|--------|----------|
| Flow List | **LIVE** — calls Kestra API | `web/src/pages/flows/FlowsList.tsx` + `flows.api.ts` |
| Flow Editor (YAML) | **PARTIAL** — Monaco works, execution panel stubbed | `web/src/components/flows/FlowWorkbench.tsx` |
| DAG Visualizer | **PROTOTYPE** — ReactFlow renders tasks, no execution binding | `web/src/components/flows/FlowCanvas.tsx` |
| Executions page | **STUB** — shell layout, no data | `web/src/pages/kestra/ExecutionsPage.tsx` |
| Logs page | **STUB** — shell layout, no data | `web/src/pages/kestra/LogsPage.tsx` |
| Instance page | **STUB** | `web/src/pages/kestra/InstancePage.tsx` |
| Namespaces page | **STUB** | `web/src/pages/kestra/NamespacesPage.tsx` |
| Plugins page | **STUB** | `web/src/pages/kestra/PluginsPage.tsx` |
| Blueprints page | **STUB** | `web/src/pages/kestra/BlueprintsPage.tsx` |
| Assets page | **STUB** | `web/src/pages/kestra/AssetsPage.tsx` |
| Tenant page | **STUB** | `web/src/pages/kestra/TenantPage.tsx` |
| Tests page | **STUB** | `web/src/pages/kestra/TestsPage.tsx` |

**Flow detail tabs (all stubs except partial ExecutionsTab/LogsTab):**
- `web/src/components/flows/tabs/ExecutionsTab.tsx`
- `web/src/components/flows/tabs/LogsTab.tsx`
- `web/src/components/flows/tabs/MetricsTab.tsx`
- `web/src/components/flows/tabs/TriggersTab.tsx`
- `web/src/components/flows/tabs/OverviewTab.tsx`
- `web/src/components/flows/tabs/RevisionsTab.tsx`
- `web/src/components/flows/tabs/DependenciesTab.tsx`
- `web/src/components/flows/tabs/ConcurrencyTab.tsx`
- `web/src/components/flows/tabs/AuditLogsTab.tsx`

**Reusable shell:** `KestraPageShell.tsx` — generic table layout used by all stub pages

**NOT building (Kestra Vue.js features that won't be ported):**
- No-code editor (schema-driven form UI)
- Kestra's Vue multi-panel container system
- Kestra's force-directed topology visualization

**App tables still needed for frontend to work (not yet created):**
- `flow_triggers`
- `flow_execution_metrics`
- `flow_topologies`
- `flow_concurrency_limits`
- `namespace_file_metadata`
- `flow_templates`
- `service_instance` (runtime health)
- `flow_tests`, `flow_test_runs`, `flow_test_results`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Postgres                         │
│                                                             │
│  ┌─────────────────┐           ┌──────────────────────┐    │
│  │  kestra_ref.*    │           │  public.*             │    │
│  │  (READ-ONLY)     │           │  (READ-WRITE)         │    │
│  │                  │           │                       │    │
│  │  21 exact Kestra │   READ    │  flow_sources          │    │
│  │  tables, no DDL  │ ────────► │  flow_executions       │    │
│  │  changes         │           │  flow_logs             │    │
│  │                  │           │  flow_triggers (TODO)  │    │
│  │                  │           │  flow_topologies (TODO)│    │
│  │                  │           │  + more (TODO)         │    │
│  └─────────────────┘           └──────────┬────────────┘    │
│                                           │                 │
└───────────────────────────────────────────┼─────────────────┘
                                            │
                    ┌───────────────────────┐│┌───────────────────────┐
                    │                       │││                       │
         ┌──────────▼──────────┐  ┌────────▼▼▼────────┐  ┌──────────▼──────────┐
         │  Python Handlers     │  │  React Frontend    │  │  Kestra Java API     │
         │  (PRIMARY)           │  │                    │  │  (FALLBACK)          │
         │                      │  │  12 pages           │  │  192.168.0.168:8088  │
         │  14/821 types done   │  │  (1 live,           │  │                      │
         │  reads kestra_ref    │  │   11 stubbed)       │  │  Executes unmapped   │
         │  writes public.*     │  │  reads public.*     │  │  task types via API   │
         │                      │  │  via Supabase API   │  │  results written to   │
         │  services/           │  │                    │  │  public.* by adapter   │
         │  pipeline-worker/    │  │  web/src/pages/    │  │                      │
         └──────────────────────┘  └────────────────────┘  └──────────────────────┘
```

**Data flow:**
- Python handlers READ from `kestra_ref.*` for contracts/schemas/plugin definitions
- Python handlers WRITE to `public.*` for operational data
- When no Python handler exists → proxy to Kestra Java API → write results to `public.*`
- Frontend reads from `public.*` via Supabase API (with RLS)

---

## Phase 3: Rename (future, after system is proven operational)

Only after the full path DB → backend → frontend is working end-to-end:

- `kestra_ref` → `bd_ref`
- `kestra` → `bd` everywhere: schema, enums, class paths (`io.kestra.*` → `io.bd.*`), filenames, docs, config, env vars
- 7 rename categories: source tree, Java types, runtime/config, API/frontend, SQL, plugins, docs
- Deterministic, scripted, category-by-category — not gradual cleanup
- If schema boundary proves too porous: promote reference schema to separate database

---

## Verification checklist

### Phase 1
1. Apply migration → `kestra_ref` schema exists with 21 tables
2. `SELECT table_name FROM information_schema.tables WHERE table_schema = 'kestra_ref';` → 21 rows
3. `kestra_ref` not visible in PostgREST API
4. `service_role` can SELECT but not INSERT/UPDATE/DELETE
5. `public.*` flow tables unaffected

### Phase 2
6. Python handler reads flow from `kestra_ref.flows`, writes execution to `public.flow_executions`
7. Unmapped task type falls back to Kestra Java API, result lands in `public.flow_executions`
8. Frontend Executions page shows real data from `public.flow_executions`
9. Frontend Logs page shows real data from `public.flow_logs`
10. Flow list page continues working (already live via Kestra API)

---

## Critical files

| Purpose | Path |
|---------|------|
| **Source schema** | `docs-approved/backend setup/kestra-sqls/kestra_schema.sql` |
| **Table listing** | `docs-approved/backend setup/kestra-sqls/tables.txt` |
| **Column details** | `docs-approved/backend setup/kestra-sqls/columns.tsv` |
| **Table definitions** | `docs-approved/backend setup/kestra-sqls/kestra_table_definitions.sql` |
| **Required table analysis** | `docs-approved/backend setup/jon/2026-03-07-kestra-required-table-inventory.md` |
| **Schema analysis** | `docs-approved/backend setup/jon/kestra-schema-analysis.md` |
| **Python handler strategy** | `web-docs/src/content/docs/internal/analysis/kestra/python-handlers.md` |
| **Pipeline worker plan** | `web-docs/src/content/docs/kestra-integration/pipeline-worker-plan.md` |
| **Two-branch plan** | `web-docs/src/content/docs/plans/2026-03-06-kestra-runtime-and-frontend-two-branch-plan.md` |
| **Native plugin design** | `web-docs/src/content/docs/plans/2026-03-02-native-plugin-execution-design.md` |
| **Plugin migration** | `web-docs/src/content/docs/plans/2026-03-04-kestra-plugins-to-services-migration.md` |
| **Backend direction** | `web-docs/src/content/docs/kestra-integration/backend-direction.md` |
| **Docs site tables** | `web-docs/src/content/docs/internal/analysis/kestra/sql-tables.md` |
| **Pipeline worker code** | `services/pipeline-worker/app/` |
| **Kestra API client** | `web/src/pages/flows/flows.api.ts` |
| **Frontend pages** | `web/src/pages/kestra/*.tsx` |
| **Flow tabs** | `web/src/components/flows/tabs/*.tsx` |
| **Flow workbench** | `web/src/components/flows/FlowWorkbench.tsx` |
| **New migration (to create)** | `supabase/migrations/20260308120000_072_kestra_ref_schema.sql` |
| **Config (no changes)** | `supabase/config.toml` |
| **Existing app migrations** | `supabase/migrations/20260305*_069/070/071_*.sql` |
