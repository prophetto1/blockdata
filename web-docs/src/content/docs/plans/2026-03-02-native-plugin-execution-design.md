---
title: 2026-03-02-native-plugin-execution-design
description: "Date: 2026-03-02"
---

Date: 2026-03-02

## What This Document Is

A blueprint for making **every callable function in blockdata** — migrated edge functions, Kestra-sourced plugins, dlt sources, dbt commands, and future custom services — execute through one system.

Two tracks are running simultaneously:

1. **Edge Function → FastAPI Migration** — 19 Supabase edge functions move to `blockdata-api` (FastAPI on :8001). Plan: tracked separately in the edge-to-fastapi migration planning docs.
2. **Native Plugin Execution** — 821 Kestra plugin types in `integration_catalog_items` become executable through `pipeline-worker` (FastAPI on :8000) and future service handlers.

These are not separate projects. They converge on the same infrastructure:

```
                        service_registry
                        ┌─────────────────────────────┐
                        │ blockdata-api    :8001       │  ← Track 1: migrated edge functions
                        │ pipeline-worker  :8000       │  ← Track 2: Kestra plugins (native)
                        │ load-runner      :8000       │  ← dlt sources
                        │ transform-runner :8000       │  ← dbt commands
                        │ docling-service  :5001       │  ← document parsing
                        │ (future services)            │
                        └─────────────────────────────┘
                                     │
                        service_functions
                        ┌─────────────────────────────┐
                        │ 15 edge functions (054)      │  ← become blockdata-api routes
                        │ 10 dlt/dbt functions (050)   │  ← already registered
                        │ 1 execute_task (new)         │  ← universal pipeline-worker entry
                        │ (future functions)            │
                        └─────────────────────────────┘
                                     │
                        service_runs
                        ┌─────────────────────────────┐
                        │ Every execution goes here    │
                        │ Same schema, same tracking   │
                        │ Regardless of which service  │
                        └─────────────────────────────┘
```

**One dispatch path.** Resolve `function_id` → `base_url + entrypoint` → HTTP call → write to `service_runs`. Doesn't matter if the handler is a migrated edge function, a Kestra plugin, or a dlt pipeline. The dispatch layer is the same.

**How the two tracks share work:**

| Component | Track 1 (FastAPI migration) | Track 2 (Plugin execution) |
|-----------|---------------------------|---------------------------|
| `blockdata-api` service | Builds it (19 routers) | Uses it (dispatch endpoint lives here) |
| `service_registry` rows | Updates edge→blockdata-api base_url | Adds pipeline-worker row |
| `service_functions` rows | Already seeded (054) | Creates execute_task + bulk mapping |
| `service_runs` writes | Writes runs for API calls | Writes runs for plugin executions |
| `resolve_task_endpoint()` SQL | Not needed (direct function_id) | Needed (task_class → function_id) |
| `SchemaForm` component | Uses it for edge function params | Uses it for Kestra task_schema |
| Auth middleware | Builds JWT decode in Python | Reuses same middleware |
| `asyncpg` pool | Builds shared pool in `db.py` | Reuses same pool |

Track 1 creates the infrastructure (blockdata-api, auth, db pool). Track 2 adds the plugin-specific wiring on top of it. Neither blocks the other, but they share the result.

Everything below references real tables, real columns, real files, and real code that exists today in this repo. Where something doesn't exist yet, that's stated explicitly as a gap.

---

## What Exists Today (Verified)

### Database Layer

**`service_type_catalog`** (Migration 050)
- 6 types seeded: dlt, dbt, docling, edge, conversion, custom

**`service_registry`** (Migration 050)
- 3 services seeded: load-runner (:8000, dlt), transform-runner (:8000, dbt), docling-service (:5001)
- Columns: `service_id`, `service_type`, `service_name`, `base_url`, `health_status`, `config`, `enabled`
- base_urls are placeholders (localhost) — no running services

**`service_functions`** (Migration 050 + 054)
- 10 functions seeded from Migration 050: 3 dlt sources + 7 dbt commands (docling service registered but no functions)
- 15 edge functions seeded from Migration 054: ingest, conversion-complete, worker, schemas, runs, etc.
- Total: 25 functions across 4 services (load-runner, transform-runner, docling-service, supabase-edge)
- Each has `parameter_schema` (JSONB array of `{name, type, required, default, description, values}`)
- dlt/dbt functions have rich parameter schemas; edge functions have `'[]'::jsonb` (empty)
- Each has `entrypoint` (e.g., `/dlt/run`, `/dbt/run`, `/functions/v1/ingest`)
- Each has `http_method` (POST, GET)

**`service_functions_view`** (Migration 050)
- Joins service_functions + service_registry + service_type_catalog
- Returns `base_url`, `entrypoint`, `http_method`, `parameter_schema` in one row
- Filters to `enabled = true` on both service and function
- This view is the runtime resolution layer — it already exists

**`service_runs`** (Migration 050)
- Full execution history table: `run_id`, `function_id`, `service_id`, `project_id`
- Status: pending → running → complete/failed/cancelled
- `config_snapshot` (JSONB): frozen parameters at execution time
- `result` (JSONB): returned data
- `error_message`, `rows_affected`, `duration_ms`
- `started_at`, `completed_at`, `created_at`
- Indexed on function_id, service_id, project_id, status, created_at
- **Zero rows** — nothing writes to this table yet

**`service_run_events`** + **`service_run_artifacts`** (Migration 051)
- Append-only log rows and storage references per run
- Also empty — waiting for execution to happen

**`integration_catalog_items`** (Migration 059)
- 821 Kestra plugin types with `task_class`, `task_schema`, `task_markdown`
- `mapped_service_id` (FK → service_registry, nullable)
- `mapped_function_id` (FK → service_functions, nullable)
- Currently **zero mappings** — all mapped_service_id and mapped_function_id are NULL
- `task_schema` contains full JSON Schema (properties, outputs, definitions, $examples)

### Pipeline Worker Service

**`services/pipeline-worker/`** — Fully scaffolded FastAPI service.

Files that exist:
- `app/main.py` — FastAPI app with `POST /execute`, `GET /health`, `GET /plugins`
- `app/registry.py` — Auto-discovers plugins at startup, maps task_type → handler
- `app/shared/base.py` — `BasePlugin` ABC + `PluginOutput` model
- `app/shared/context.py` — `ExecutionContext` with template rendering `{{ expressions }}`
- `app/shared/output.py` — `success()`, `failed()`, `warning()` helpers
- `app/shared/runner.py` — Async subprocess executor with timeout + env vars
- `app/shared/auth.py` — Credential resolution from env vars
- `app/plugins/core.py` — 8 types: Log, Sleep, Pause, If, Switch, ForEach, Parallel, Sequential
- `app/plugins/http.py` — 2 types: HTTP Request, HTTP Download
- `app/plugins/scripts.py` — 3 types: Python, Shell, Node script execution
- `Dockerfile`, `pyproject.toml`, `requirements.txt`
- `tests/` — conftest, test_core, test_http, test_scripts (186 lines total)

Endpoint contract:
```
POST /execute
  body: { task_type, params, execution_id, task_run_id, variables }
  returns: { task_type, output: { data, state, logs } }

GET /health → { status: "ok", plugins: 14 }
GET /plugins → [ { class, task_types, parameter_schema } ]
```

**13 plugin types handled locally.** Remaining 808 task_classes from the catalog have no handler yet.

### Admin UI

**`IntegrationCatalogPanel.tsx`** — Displays catalog items, search, per-item mapping dropdowns
**`ServicesPanel.tsx`** — Service + function CRUD, config dialog, realtime subscription
**`admin-integration-catalog` edge function** — GET items/services/functions, PATCH mapping, sync/hydrate
**`admin-services` edge function** — Full service/function CRUD, import JSON

### Type Inference (already implemented in admin-services)

`inferServiceTypeFromPluginType()` in `admin-services/index.ts`:
- `.dbt.` → dbt
- `.docling.` / document / parser → docling
- `.jdbc.` / `.sql.` / `.dlt.` / sqlite → dlt
- convert → conversion
- else → custom

`inferFunctionTypeFromPluginType()`:
- `.dbt.` → transform
- `.jdbc.` / `.sql.` / trigger → source
- `.docling.` / parse → parse
- convert → convert
- else → utility

---

## The Execution Chain (10 Steps)

This is the full path from "user clicks Run" to "result displayed." Steps 1-3 and 8-10 exist. Steps 4-7 are the gaps.

```
Step  1: User selects a plugin in the UI (task_class known)          ✅ EXISTS
Step  2: UI loads task_schema from integration_catalog_items          ✅ EXISTS
Step  3: UI renders parameter form from task_schema properties       ❌ MISSING
Step  4: User fills in params, clicks Execute                        ❌ MISSING
Step  5: Frontend calls dispatch endpoint with task_class + params   ❌ MISSING
Step  6: Backend resolves task_class → base_url + entrypoint         ❌ MISSING (view exists, no caller)
Step  7: Backend POSTs to pipeline-worker /execute                   ❌ MISSING
Step  8: Pipeline-worker resolves task_type → plugin handler         ✅ EXISTS
Step  9: Plugin runs, returns PluginOutput                           ✅ EXISTS
Step 10: Result stored in service_runs, returned to frontend         ❌ MISSING (table exists, no writer)
```

---

## Gap Analysis — What Needs To Be Built

### Gap 1: Task-Class Resolution (Database → Endpoint URL)

**What exists:** `service_functions_view` already joins the three tables and returns `base_url + entrypoint + http_method`. `integration_catalog_items` has `mapped_function_id` FK.

**What's missing:** No SQL function or API endpoint that takes a `task_class` string and returns the resolved endpoint.

**Implementation:**

Create a SQL function `resolve_task_endpoint(p_task_class TEXT)`:

```sql
CREATE OR REPLACE FUNCTION public.resolve_task_endpoint(p_task_class TEXT)
RETURNS TABLE (
  base_url TEXT,
  entrypoint TEXT,
  http_method TEXT,
  service_id UUID,
  function_id UUID,
  parameter_schema JSONB
) AS $$
  SELECT
    sr.base_url,
    sf.entrypoint,
    sf.http_method,
    sr.service_id,
    sf.function_id,
    sf.parameter_schema
  FROM integration_catalog_items ici
  JOIN service_functions sf ON sf.function_id = ici.mapped_function_id
  JOIN service_registry sr ON sr.service_id = sf.service_id
  WHERE ici.task_class = p_task_class
    AND ici.enabled = true
    AND sf.enabled = true
    AND sr.enabled = true;
$$ LANGUAGE sql STABLE;
```

This is pure SQL — no new table, no new column. It chains:
`integration_catalog_items.mapped_function_id` → `service_functions.function_id` → `service_registry.service_id`

If any link in the chain is NULL, disabled, or missing, it returns zero rows. The caller handles that as "not executable."

**Cost:** One migration file. ~15 lines SQL.

### Gap 2: Dispatch Endpoint (Frontend → Backend → Pipeline-Worker)

**What exists:** Pipeline-worker has `POST /execute`. `service_runs` table exists with all needed columns.

**What's missing:** An API endpoint the frontend can call that:
1. Resolves task_class to endpoint URL (via Gap 1)
2. Creates a `service_runs` row (status: pending)
3. POSTs to the pipeline-worker's `/execute`
4. Updates the `service_runs` row with result/error
5. Returns the run_id + result to frontend

**Implementation:**

This lives in **blockdata-api** (the FastAPI service replacing edge functions). But since blockdata-api doesn't exist yet, the immediate option is an edge function:

**`supabase/functions/execute-task/index.ts`** (or add to `admin-services`):

```
POST /execute-task
  body: { task_class, params, project_id? }

  1. Call resolve_task_endpoint(task_class) via RPC
  2. If no result → 404 "Task class not mapped to any service"
  3. Insert into service_runs (function_id, service_id, project_id, status='running', config_snapshot=params, started_at=now())
  4. POST to base_url + entrypoint with { task_type: task_class, params, execution_id: run_id }
  5. On success: UPDATE service_runs SET status='complete', result=response.output, completed_at=now(), duration_ms=...
  6. On failure: UPDATE service_runs SET status='failed', error_message=..., completed_at=now()
  7. Return { run_id, status, result }
```

**Alternatively**, this can be an endpoint on the pipeline-worker itself that also writes to the database. But that mixes compute with orchestration — cleaner to keep it separate.

**Cost:** One edge function (~150 lines) or one FastAPI router. One migration for `resolve_task_endpoint` SQL function.

### Gap 3: Catalog-to-Registry Mapping (821 items → service_functions)

**What exists:** `integration_catalog_items` has `mapped_service_id` and `mapped_function_id` columns. Admin UI supports per-item manual mapping. `inferServiceTypeFromPluginType()` and `inferFunctionTypeFromPluginType()` exist in admin-services.

**What's missing:** All 821 catalog items have NULL mappings. No bulk mapping mechanism. Manual one-by-one mapping of 821 items is not feasible.

**Two approaches (both needed):**

**A. One-to-Many Handler Functions**

Not every Kestra task_class needs its own `service_functions` row. Most map many-to-one:

| Pattern | Handler Function | Count |
|---------|-----------------|-------|
| `io.kestra.plugin.scripts.*` | `scripts_execute` | ~40 types |
| `io.kestra.plugin.core.http.*` | `http_request` | ~8 types |
| `io.kestra.plugin.core.log.*` | `log` | ~3 types |
| `io.kestra.plugin.core.flow.*` | `flow_control` | ~15 types |
| `io.kestra.plugin.jdbc.*` | `sql_query` (future) | ~50 types |
| `io.kestra.plugin.notifications.*` | `http_webhook` | ~30 types |

The pipeline-worker already handles this internally — its registry maps multiple task_types to one plugin class. But the database doesn't know about it yet.

**B. Bulk Mapping SQL**

Create handler functions in `service_functions` for the pipeline-worker, then map catalog items to them:

```sql
-- Step 1: Register the pipeline-worker in service_registry
INSERT INTO service_registry (service_type, service_name, base_url, config)
VALUES ('custom', 'pipeline-worker', 'http://localhost:8000', '{"version": "0.1.0"}');

-- Step 2: Register handler functions
INSERT INTO service_functions (service_id, function_name, function_type, label, entrypoint, http_method, parameter_schema)
VALUES
  (:worker_id, 'execute_task', 'utility', 'Execute Plugin', '/execute', 'POST', '[]'),
  -- The pipeline-worker /execute endpoint is a universal dispatcher
  -- parameter_schema is empty because each task_class brings its own schema from task_schema
  ;

-- Step 3: Bulk-map all catalog items whose task_class is handled by pipeline-worker
UPDATE integration_catalog_items
SET mapped_service_id = :worker_id,
    mapped_function_id = :execute_fn_id,
    mapping_notes = 'auto-mapped: pipeline-worker handles this task_type natively'
WHERE task_class IN (
  'io.kestra.plugin.core.log.Log',
  'io.kestra.plugin.core.flow.Sleep',
  'io.kestra.plugin.core.flow.Pause',
  'io.kestra.plugin.core.flow.If',
  'io.kestra.plugin.core.flow.Switch',
  'io.kestra.plugin.core.flow.ForEach',
  'io.kestra.plugin.core.flow.Parallel',
  'io.kestra.plugin.core.flow.Sequential',
  'io.kestra.plugin.core.http.Request',
  'io.kestra.plugin.core.http.Download',
  'io.kestra.plugin.scripts.python.Script',
  'io.kestra.plugin.scripts.shell.Script',
  'io.kestra.plugin.scripts.node.Script'
);
```

For the remaining ~808 unmapped items, they stay unmapped (and therefore not executable) until their handler is implemented in pipeline-worker.

**C. Auto-Sync from Pipeline-Worker /plugins**

The pipeline-worker's `GET /plugins` endpoint returns all registered task_types with parameter schemas. A sync function can:
1. Call `GET /plugins` on the pipeline-worker
2. For each task_type returned, find the matching `integration_catalog_items` row by task_class
3. Set `mapped_service_id` and `mapped_function_id`

This keeps mappings in sync as new plugins are added to the pipeline-worker.

**Cost:** One migration (register pipeline-worker + handler functions). One sync function in admin-integration-catalog or admin-services (~50 lines).

### Gap 4: Parameter Form UI

**What exists:** `task_schema` on catalog items contains full JSON Schema (properties with types, descriptions, defaults, enums). `parameter_schema` on service_functions has a flat array format `[{name, type, required, default, description, values}]`. The admin `ServiceDetailPanel.tsx` displays parameter_schema read-only. `SettingsProviderForm.tsx` uses Ark UI Field/Select/NumberInput for credential forms.

**What's missing:** No component that takes a JSON Schema (from `task_schema.properties`) and renders a fillable form with proper controls per type.

**Implementation:**

Create `web/src/components/common/SchemaForm.tsx`:

```typescript
type SchemaFormProps = {
  schema: Record<string, {
    type?: string;
    description?: string;
    default?: unknown;
    enum?: string[];
    format?: string;
  }>;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
};
```

Type-to-control mapping:
- `string` → Ark UI `Field` + `<input>`
- `string` with `enum` → Ark UI `Select`
- `integer` / `number` → Ark UI `NumberInput`
- `boolean` → Ark UI `Switch`
- `object` / `array` → Monaco editor (JSON)
- `string` with `format: "duration"` → duration picker or text input
- `string` with `format: "uri"` → text input with URL validation

For `parameter_schema` (the flat array format on service_functions), convert to the same form:
```typescript
function paramDefsToSchema(params: ParamDef[]): SchemaFormProps['schema'] {
  return Object.fromEntries(params.map(p => [p.name, {
    type: p.type,
    description: p.description,
    default: p.default,
    enum: p.values,
  }]));
}
```

**Cost:** One new React component (~200 lines). Uses existing Ark UI primitives already in the project.

### Gap 5: Dispatch UI (Run Button + Result Display)

**What's missing:** A "Run" button that sends params to the dispatch endpoint (Gap 2) and displays the result.

**Implementation:** Add to `ServiceDetailPanel.tsx` or as a standalone dialog:

1. "Run" button per function row (disabled if function has no mapped service or service is offline)
2. Click opens dialog with SchemaForm (Gap 4) pre-populated with defaults
3. Submit calls dispatch endpoint
4. Poll or realtime-subscribe to `service_runs` for status updates
5. Display result JSON + logs + duration on completion

For catalog items (IntegrationCatalogPanel): same pattern, but only enabled when `mapped_function_id` is set.

**Cost:** ~100 lines of UI in existing panel files. Depends on Gap 2 (dispatch endpoint) and Gap 4 (SchemaForm).

### Gap 6: Flow Orchestrator (Future — Not MVP)

**What exists:** `flows` edge function stores/validates YAML. `FlowCanvas.tsx` renders a visual DAG (hardcoded demo). Flow YAML has `id`, `namespace`, `tasks` array.

**What's missing:** Everything about executing a flow — parsing tasks, resolving dependencies, dispatching in order, aggregating results.

**This is explicitly Phase 2.** The MVP is single-task execution (Gaps 1-5). Flow orchestration is a superset — it calls the same dispatch endpoint per task but adds:
- YAML task list parsing
- Dependency resolution (topological sort)
- Sequential/parallel dispatch based on flow control tasks
- Variable passing between tasks (outputs → inputs)
- Flow-level status tracking

**Deferred.** Not blocking anything.

---

## Implementation Order

| Step | What | Depends On | Files Changed |
|------|------|-----------|---------------|
| **1** | SQL: `resolve_task_endpoint` function | Nothing | New migration (~15 lines) |
| **2** | SQL: Register pipeline-worker in service_registry + create execute_task function | Step 1 | Same or new migration (~30 lines) |
| **3** | SQL: Bulk-map the 13 handled task_classes | Step 2 | Same migration |
| **4** | Edge function or FastAPI: dispatch endpoint | Steps 1-3 | New edge function (~150 lines) or FastAPI router |
| **5** | React: SchemaForm component | Nothing | New component (~200 lines) |
| **6** | React: Run button + result display | Steps 4-5 | Edit ServiceDetailPanel.tsx + IntegrationCatalogPanel.tsx |
| **7** | Auto-sync: pipeline-worker /plugins → catalog mappings | Steps 2-3 | Edit admin-integration-catalog edge function (~50 lines) |

Steps 1-3 are one migration. Step 4 is one file. Step 5 is one component. Step 6 is edits to existing files. Step 7 is an enhancement.

**MVP is Steps 1-6.** After that, a user can:
1. Browse the catalog
2. Pick a plugin that has a handler (13 types today)
3. Fill in parameters via a form
4. Click Run
5. See the result

**Expanding coverage** means adding more plugin families to pipeline-worker (sql.py, cloud_storage.py, etc.) and re-running the auto-sync (Step 7) to map them.

---

## How The Two Tracks Sequence

Neither track blocks the other. But some steps have a natural order:

```
Track 1 (FastAPI migration)              Track 2 (Plugin execution)
─────────────────────────────            ─────────────────────────────
Phase 1: Scaffold blockdata-api          Can start NOW (edge function
  - FastAPI app, auth, db pool             dispatch works without
  - Admin routers (config, services,       blockdata-api)
    catalog, browser)
                                         Step 1: resolve_task_endpoint SQL
Phase 2: User-facing CRUD routers       Step 2: Register pipeline-worker
  - schemas, runs, flows, api-keys       Step 3: Bulk-map 13 task_classes
                                         Step 4: Dispatch endpoint (edge fn)
                                         Step 5: SchemaForm component
Phase 3: Pipeline orchestration          Step 6: Run button + result display
  - ingest, trigger-parse,               Step 7: Auto-sync from /plugins
    conversion-complete
                                         ─── converge ───
Phase 4: Worker migration               Move dispatch from edge fn
  - 1,442-line worker → Python             to blockdata-api router
                                         Pipeline-worker → Ubuntu box
Phase 5: Assistant chat                  Flow orchestrator (DAG walker)
  - SSE streaming → Python               Triggers (cron, webhook)
```

**The merge point** is after Track 1 Phase 2 and Track 2 Step 6. At that point blockdata-api exists with auth + db pool, and the dispatch endpoint migrates from its temporary edge function home into blockdata-api as a proper router. Same logic, better home.

---

## What Gets Deferred

| Item | Why | When |
|------|-----|------|
| Flow orchestrator (DAG walker) | Needs single-task execution to work first | After both tracks merge |
| Triggers (cron, webhook, realtime) | Manual execution first | After flow orchestrator |
| Health check probes | Services aren't running yet | After pipeline-worker on Ubuntu box |
| SQL/cloud/messaging plugins | Pipeline-worker handles 13 types; expand later | After MVP proven |
| Bulk pattern-based mapping rules | Auto-sync from /plugins is simpler | After more plugins implemented |
| Move dispatch to blockdata-api | Edge function works fine temporarily | After Track 1 Phase 2 |

---

## Decisions Locked

1. **One execution system.** Every callable thing — migrated edge function, Kestra plugin, dlt pipeline, dbt command, custom script — goes through `service_registry → service_functions → service_runs`. No parallel dispatch paths.

2. **Execution target:** Both native (pipeline-worker) and dispatch (HTTP to external services). The pipeline-worker IS the native handler. External services get dispatched via the same `base_url + entrypoint` pattern.

3. **Stable identifier:** `task_class` (e.g., `io.kestra.plugin.core.log.Log`). This is the unique key in `integration_catalog_items` and maps to `task_types` in pipeline-worker's plugin registry. For non-catalog functions (dlt, dbt, edge), `function_id` is the stable identifier directly.

4. **Triggers are Phase 2.** Manual execution first. No cron, no webhooks, no realtime triggers until single-task execution works end-to-end.

5. **Database access:** `asyncpg` exclusively when this moves to FastAPI. No mixing with `supabase-py`. Shared pool in blockdata-api's `db.py`.

6. **The pipeline-worker `/execute` endpoint is universal.** It takes any `task_type` and dispatches internally to the right plugin. The database doesn't need one `service_functions` row per task_class — one `execute_task` function pointing to `/execute` handles all mapped types.

7. **Edge function dispatch is temporary.** The `execute-task` edge function gets the system working now. Once blockdata-api exists (Track 1 Phase 2), the dispatch endpoint moves there. Same logic, same contract, same `service_runs` writes.

---

## Verification Checklist

After implementing Steps 1-6:

- [ ] `SELECT * FROM resolve_task_endpoint('io.kestra.plugin.core.log.Log')` returns base_url, entrypoint, http_method
- [ ] `SELECT * FROM resolve_task_endpoint('nonexistent.class')` returns zero rows
- [ ] Pipeline-worker is registered in `service_registry` with correct base_url
- [ ] `service_functions` has `execute_task` function pointing to `/execute`
- [ ] 13 `integration_catalog_items` rows have non-null `mapped_function_id`
- [ ] Dispatch endpoint: POST with `{task_class: "io.kestra.plugin.core.log.Log", params: {message: "hello"}}` returns `{status: "complete", result: {logs: ["hello"]}}`
- [ ] `service_runs` has a new row with status='complete' after the above call
- [ ] SchemaForm renders string/number/boolean/enum fields correctly
- [ ] Run button is disabled for unmapped catalog items
- [ ] `npm run build` passes clean

---

## Changelog

| Date | Update |
|------|--------|
| 2026-03-02 | Initial design. 6 gaps identified against actual codebase state. Implementation order defined. |
| 2026-03-02 | Reframed as unified service execution. Two-track convergence diagram added. Edge→FastAPI migration and plugin execution share infrastructure, don't block each other. |
