# Pipeline Worker Integration — Full Implementation Guide

## What We're Building

A Python FastAPI service (`pipeline-worker`) that replaces Kestra's JVM plugin runtime. Kestra remains the design spec and plugin catalog source — we use its 821 plugin type definitions as our schema, but execution is 100% Python. The service is managed from the blockdata admin UI and backed by Supabase.

**Three layers, every step touches all three:**

| Layer | Where | What changes |
|-------|-------|-------------|
| **Frontend** | `web/src/pages/settings/` | Admin panels for managing services, plugins, instance config |
| **Backend** | `services/pipeline-worker/` + `supabase/functions/` | FastAPI plugin execution + Deno edge function orchestration |
| **Database** | Supabase `admin_runtime_policy`, `service_registry`, `service_functions`, `integration_catalog_items` | Config persistence, plugin registry, execution history |

---

## Reference Assets

| Asset | Location | Purpose |
|-------|----------|---------|
| Kestra source | Local Docker instance + source code | Plugin type definitions, parameter schemas, behavior spec |
| Kestra plugin API | `http://localhost:8080/api/v1/plugins` | Live catalog of 821 plugin types for sync |
| Pipeline worker | `services/pipeline-worker/` | The Python service being built |
| Admin UI | `web/src/pages/settings/` | Frontend management panels |
| Edge functions | `supabase/functions/admin-config/`, `admin-services/`, `admin-integration-catalog/` | Backend CRUD APIs |
| Service registry | Supabase tables: `service_registry`, `service_functions`, `service_runs` | Plugin/function tracking |
| Integration catalog | Supabase table: `integration_catalog_items` | Kestra→blockdata plugin mapping |

---

## Step 1: Scaffold (DONE)

**What was built:**
- FastAPI app with `/execute`, `/health`, `/plugins` endpoints
- `BasePlugin` ABC contract — every plugin implements `task_types[]` + `run(params, context) → PluginOutput`
- `ExecutionContext` — template rendering (`{{ expr }}`), secret resolution, file upload
- Plugin auto-discovery registry — scans `plugins/` directory, maps `io.kestra.plugin.*` → handler
- Subprocess runner for script execution
- Supabase Storage helpers
- Dockerfile (Python 3.11-slim + uvicorn)

**Files:** `app/main.py`, `app/registry.py`, `app/shared/base.py`, `app/shared/context.py`, `app/shared/auth.py`, `app/shared/runner.py`, `app/shared/storage.py`, `app/shared/output.py`, `Dockerfile`, `pyproject.toml`

**QA checkpoints:**
- [ ] `docker build -t pipeline-worker services/pipeline-worker/` succeeds
- [ ] `GET /health` returns `{"status": "ok", "plugins": N}`
- [ ] `GET /plugins` returns registered task types with parameter schemas
- [ ] `POST /execute` with unknown task_type returns 404

---

## Step 2: Core Plugins (~60 types) (PARTIALLY DONE)

**What exists:** Log, Sleep, Pause, If, Switch, ForEach, Parallel, Sequential (8 plugins in `core.py`)

**What remains (~52 types):**

### 2a. KV Store plugins
Map Kestra's `io.kestra.plugin.core.kv.*` (Get, Set, Delete, GetKeys) to Supabase key-value storage.

| Kestra type | Handler | Backing store |
|-------------|---------|--------------|
| `core.kv.Get` | Read key | Supabase table or edge function |
| `core.kv.Set` | Write key | Supabase table or edge function |
| `core.kv.Delete` | Delete key | Supabase table or edge function |
| `core.kv.GetKeys` | List keys | Supabase table or edge function |

**DB requirement:** Needs a `pipeline_kv_store` table (key, value_jsonb, namespace, ttl, created_at, updated_at).

### 2b. State plugins
Map Kestra's `io.kestra.plugin.core.state.*` (Get, Set, Delete) — similar to KV but scoped to execution.

### 2c. Storage plugins
Map Kestra's `io.kestra.plugin.core.storage.*` — file CRUD against Supabase Storage.

| Kestra type | Handler |
|-------------|---------|
| `core.storage.LocalFiles` | Read local files into context |
| `core.storage.Concat` | Concatenate files |
| `core.storage.Delete` | Delete from storage |
| `core.storage.Filter` | Filter file list |
| `core.storage.Size` | Get file size |
| `core.storage.Split` | Split file into chunks |

### 2d. Trigger/Condition types
These are metadata — the orchestrator uses them, not the worker. But they need registry entries so the Integration Catalog can map them.

| Category | Count | Notes |
|----------|-------|-------|
| Triggers | ~10 | Schedule, Webhook, Flow, Polling — orchestrator-side |
| Conditions | ~15 | DateTimeBetween, DayOfWeek, ExecutionStatus — orchestrator evaluates |

### 2e. Remaining core flow types
| Kestra type | Handler | Notes |
|-------------|---------|-------|
| `core.flow.Dag` | Return DAG execution plan | Orchestrator handles actual scheduling |
| `core.flow.Template` | Resolve template reference | Template expansion |
| `core.flow.WorkingDirectory` | Set up temp dir context | Runner creates isolated workdir |
| `core.flow.Subflow` | Trigger nested flow | Orchestrator handles |
| `core.flow.AllowFailure` | Wrap task with error tolerance | Returns continue-on-error flag |
| `core.flow.Retry` | Configure retry policy | Returns retry config to orchestrator |
| `core.flow.Timeout` | Set task timeout | Returns timeout config |

**QA checkpoints:**
- [ ] `POST /execute` with `io.kestra.plugin.core.kv.Set` writes to DB
- [ ] `POST /execute` with `io.kestra.plugin.core.kv.Get` reads it back
- [ ] Storage plugins upload/download via Supabase Storage
- [ ] All flow-control plugins return correct branch/plan data
- [ ] `GET /plugins` shows all ~60 core types registered

---

## Step 3: Script Plugins (~12 types) (MOSTLY DONE)

**What exists:** Python, Shell, Node (6 types in `scripts.py`)

**What remains:**

| Kestra type | Interpreter | Notes |
|-------------|-------------|-------|
| `scripts.r.Script` | `Rscript -e` | Same subprocess pattern |
| `scripts.r.Commands` | `Rscript -e` | Commands list variant |
| `scripts.powershell.Script` | `pwsh -Command` | PowerShell Core |
| `scripts.powershell.Commands` | `pwsh -Command` | Commands list |
| `scripts.julia.Script` | `julia -e` | If Julia installed |
| `scripts.ruby.Script` | `ruby -e` | If Ruby installed |

All follow the exact same pattern as existing plugins — change the interpreter array.

**Runner enhancements needed:**
- [ ] `beforeCommands` should support pip install / npm install with caching
- [ ] Container isolation mode (Docker-in-Docker) — future, not blocking
- [ ] Output file capture (`outputFiles` glob patterns) — exists but needs testing
- [ ] Input file injection — write context files to workdir before execution

**QA checkpoints:**
- [ ] Python script that prints JSON to stdout → captured in output.data
- [ ] Shell script with env vars → vars accessible in script
- [ ] Script with `beforeCommands: ["pip install requests"]` → package available
- [ ] Script exceeding timeout → killed, returns FAILED with timeout message
- [ ] Script writing to output files → files captured in result

---

## Step 4: HTTP Plugins (~5 types) (DONE)

**What exists:** Request, Download (in `http.py`)

**What may remain:**

| Kestra type | Handler | Notes |
|-------------|---------|-------|
| `core.http.Trigger` | N/A | Orchestrator-side webhook trigger |
| SSE streaming | HttpRequestPlugin | Add streaming response support |
| GraphQL | HttpRequestPlugin | Just a POST with query body |

**QA checkpoints:**
- [ ] `POST /execute` with HTTP GET to `httpbin.org/get` → returns status 200 + body
- [ ] HTTP POST with JSON body → body sent correctly
- [ ] HTTP with BASIC auth → credentials applied
- [ ] HTTP with BEARER auth → token in header
- [ ] HTTP to non-existent host → returns FAILED gracefully (not crash)
- [ ] Download → file stored in Supabase Storage, URL returned

---

## Step 5: SQL/JDBC Plugins (~100+ types)

**Not started.** This is the first large family.

**Architecture:** One `BaseSqlPlugin` with connection factory. Each database is a thin subclass providing driver config. All return `{"rows": [...], "row_count": N}`.

| Database | Python driver | Kestra plugin group |
|----------|--------------|-------------------|
| PostgreSQL | `asyncpg` | `plugin.jdbc.postgresql` |
| MySQL | `aiomysql` | `plugin.jdbc.mysql` |
| SQLite | `aiosqlite` | `plugin.jdbc.sqlite` |
| DuckDB | `duckdb` | `plugin.jdbc.duckdb` |
| BigQuery | `google-cloud-bigquery` | `plugin.gcp.bigquery` |
| Snowflake | `snowflake-connector-python` | `plugin.jdbc.snowflake` |
| ClickHouse | `clickhouse-connect` | `plugin.jdbc.clickhouse` |
| MS SQL | `pymssql` | `plugin.jdbc.sqlserver` |

**Per-database task types (each DB has ~5-8):**

| Task type pattern | Handler |
|-------------------|---------|
| `*.Query` | Execute SQL, return rows |
| `*.Queries` | Execute multiple statements |
| `*.FetchOne` | Query returning single row |
| `*.FetchSize` | Query with pagination |
| `*.Upload` | Bulk insert from file/data |
| `*.Download` | Export query results to file |
| `*.Trigger` | Polling trigger (orchestrator-side) |

**Implementation pattern:**
```python
class BaseSqlPlugin(BasePlugin):
    async def get_connection(self, params, context): ...
    async def run(self, params, context):
        conn = await self.get_connection(params, context)
        rows = await conn.execute(context.render(params["sql"]))
        return success(data={"rows": rows, "row_count": len(rows)})

class PostgresPlugin(BaseSqlPlugin):
    task_types = ["io.kestra.plugin.jdbc.postgresql.Query", ...]
    async def get_connection(self, params, context):
        return await asyncpg.connect(context.render(params["url"]))
```

**DB requirement:** Connection strings stored as secrets in Supabase vault, resolved via `context.get_secret()`.

**Dependencies to add:** `asyncpg`, `aiomysql`, `duckdb`, `google-cloud-bigquery`, `snowflake-connector-python`

**QA checkpoints:**
- [ ] PostgreSQL query returns rows
- [ ] DuckDB query against local file works
- [ ] SQL injection via parameter binding (NOT string interpolation)
- [ ] Connection failure → FAILED state, not crash
- [ ] Large result set handling (streaming vs memory)
- [ ] Connection cleanup on error (no leaked connections)

---

## Step 6: Remaining Families (~640+ types)

**Not started.** Each family follows the BasePlugin contract.

### 6a. Cloud Storage (~30 types)
| Family | Python SDK | Operations |
|--------|-----------|------------|
| AWS S3 | `boto3` | List, Upload, Download, Delete, Copy, CreateBucket |
| GCS | `google-cloud-storage` | Same operations |
| Azure Blob | `azure-storage-blob` | Same operations |

### 6b. Messaging/Notifications (~25 types)
| Service | Method | Operations |
|---------|--------|------------|
| Slack | `httpx` webhook | Send message, upload file |
| Email | `smtplib` / `aiosmtplib` | Send email with attachments |
| Teams | `httpx` webhook | Send adaptive card |
| Discord | `httpx` webhook | Send message |
| PagerDuty | `httpx` API | Create incident |

### 6c. Git (~8 types)
| Operation | Method |
|-----------|--------|
| Clone | `subprocess: git clone` |
| Push | `subprocess: git push` |
| Sync | Clone + commit + push |

### 6d. Transform (~15 types)
| Tool | Method | Operations |
|------|--------|------------|
| dbt | `subprocess: dbt run/test/build` | All dbt CLI commands |
| dlt | `subprocess: python -c "import dlt; ..."` | Pipeline run |
| File transforms | Python stdlib | CSV→JSON, JSON→CSV, merge, split |

### 6e. Queue/Streaming (~30 types)
| Service | Python SDK |
|---------|-----------|
| Kafka | `aiokafka` |
| RabbitMQ | `aio-pika` |
| Redis | `redis.asyncio` |
| NATS | `nats-py` |
| MQTT | `aiomqtt` |

### 6f. Cloud Compute/Infra (~50 types)
| Service | Python SDK |
|---------|-----------|
| AWS Lambda | `boto3` |
| GCP Cloud Functions | `google-cloud-functions` |
| Docker | `docker-py` (or subprocess) |
| Kubernetes | `kubernetes` |
| Terraform | `subprocess: terraform` |

### 6g. Data/AI (~20 types)
| Service | Python SDK |
|---------|-----------|
| OpenAI | `openai` |
| Pinecone | `pinecone-client` |
| Weaviate | `weaviate-client` |
| Elasticsearch | `elasticsearch` |

**QA approach for Step 6:** Each family has the same test pattern:
1. Can the plugin be instantiated?
2. Does it register its task_types?
3. Does parameter_schema() return valid definitions?
4. Does a mock execution return the correct output shape?
5. Does a real execution against a test service work?
6. Does error handling produce FAILED state, not crash?

---

## Frontend Admin Panels

### Currently working:
| Panel | Path | What it does |
|-------|------|-------------|
| **Runtime Policy** | `/admin/models` | 23 policy keys for worker/model/upload config |
| **Services** | `/admin/services` | CRUD for `service_registry` + `service_functions` |
| **Integration Catalog** | `/admin/integration-catalog` | Kestra plugin sync + mapping to blockdata services |
| **Instance Config** | `/admin/instance-config` | 22 pipeline-worker settings (platform, jobs, workers, registries, alerts, observability, secrets) — **just wired to DB** |

### Frontend work remaining:
1. **Plugin health dashboard** — show pipeline-worker `/health` status, last heartbeat, registered plugin count
2. **Function test runner** — pick a service function, fill params from `parameter_schema`, execute, see result inline
3. **Execution history** — list `service_runs` with status, duration, result preview
4. **Plugin detail view** — expand Integration Catalog item to show full parameter schema, markdown docs, test execution

---

## Database Tables Involved

| Table | Role | Current state |
|-------|------|--------------|
| `admin_runtime_policy` | All config (runtime + instance) | 45 keys (23 runtime + 22 instance) |
| `admin_runtime_policy_audit` | Change tracking | Working, auto-populated on every write |
| `service_type_catalog` | Service categories | 6 types: dlt, dbt, docling, edge, conversion, custom |
| `service_registry` | Registered service instances | 5 services registered |
| `service_functions` | Callable functions per service | 29 functions registered |
| `service_functions_view` | Joined view for UI | Working |
| `service_runs` | Execution history | Schema ready, 0 rows |
| `project_service_config` | Per-project service overrides | Schema ready, 0 rows |
| `integration_catalog_items` | Kestra plugin → blockdata mapping | Populated via sync |

### Tables still needed:
| Table | Purpose | When |
|-------|---------|------|
| `pipeline_kv_store` | KV storage for core.kv plugins | Step 2a |
| `pipeline_execution_state` | Per-execution state for core.state plugins | Step 2b |

---

## QA/Debug Team Assignments

### Member 1: Backend Plugin QA
**Focus:** Does each plugin execute correctly?

**Method:**
1. Start pipeline-worker locally: `cd services/pipeline-worker && uvicorn app.main:app --reload`
2. Hit `GET /plugins` — verify all expected task_types are registered
3. For each plugin, send `POST /execute` with test params
4. Verify output shape: `{state: "SUCCESS"|"FAILED", data: {...}, logs: [...]}`
5. Test error cases: missing required params, invalid values, timeouts
6. Compare behavior against Kestra docs for that plugin type

**Tools:** curl/httpie, Kestra docs at `https://kestra.io/plugins`, local Kestra instance for behavior comparison

**Checklist per plugin:**
- [ ] Registers correct task_types
- [ ] parameter_schema() matches Kestra's parameter definitions
- [ ] Successful execution returns expected data shape
- [ ] Missing required params → clear error message
- [ ] Template expressions (`{{ }}`) render correctly in params
- [ ] Error conditions → FAILED state, not HTTP 500

### Member 2: Frontend/Integration QA
**Focus:** Do the admin panels work end-to-end?

**Method:**
1. Open `blockdata.run/app/settings/admin/instance-config` — verify all 7 sections load with DB values
2. Change a setting → Save → Refresh page → verify it persisted
3. Check audit trail: query `admin_runtime_policy_audit` for the change
4. Open Services panel → verify pipeline-worker service is listed
5. Open Integration Catalog → sync from Kestra → verify items appear
6. Map a catalog item to a service function → save → verify mapping persists

**Checklist:**
- [ ] Instance Config loads all 22 settings from DB (not defaults)
- [ ] Per-field save works (dirty indicator, save button)
- [ ] Bulk "Save all" works for multiple changed fields
- [ ] Error states display properly (network error, validation error)
- [ ] Services panel shows pipeline-worker health status
- [ ] Integration Catalog sync imports correct plugin count
- [ ] Catalog item mapping to service/function saves correctly

### Member 3: Database/Edge Function QA
**Focus:** Is the data layer correct and consistent?

**Method:**
1. Query `admin_runtime_policy` — verify all 45 keys present with correct types
2. Change a value via the UI → verify `admin_runtime_policy_audit` has the change log
3. Register pipeline-worker in `service_registry` → verify health_status updates
4. Bulk-create `service_functions` from worker `/plugins` → verify count matches
5. Create a `service_run` → verify status transitions work
6. Test RLS — non-superuser should NOT be able to read/write admin tables

**Checklist:**
- [ ] All 45 policy keys have correct `value_type` (boolean, integer, string, etc.)
- [ ] Audit trail captures old_value, new_value, changed_by, changed_at
- [ ] `service_registry` accepts new service with health check
- [ ] `service_functions` bulk insert from `/plugins` endpoint works
- [ ] `service_runs` captures execution with config_snapshot, result, duration
- [ ] RLS blocks non-superuser access to admin tables
- [ ] Edge function `admin-config` returns 403 for non-superuser
- [ ] Edge function handles malformed payloads gracefully (no 500s)

---

## Execution Order

```
Step 1 ✅  Scaffold (done)
Step 2 🔧  Core plugins — KV, State, Storage, remaining flow types
Step 3 🔧  Script plugins — R, PowerShell, runner enhancements
Step 4 ✅  HTTP plugins (done)
         ↓
    [QA gate: core + scripts + http all pass]
         ↓
Step 5    SQL plugins — BaseSqlPlugin + 8 database drivers
Step 6    Remaining families — cloud, messaging, git, transform, queue
         ↓
    [QA gate: all families pass]
         ↓
Step 7    Wire to orchestrator — edge function dispatches to pipeline-worker
```

Steps 5 and 6 can be parallelized by family — one developer can work on sql.py while another works on cloud_storage.py. Each family is independent.

---

## Key Design Decisions

1. **Same table for all config** — `admin_runtime_policy` holds both runtime policy (worker/model/upload) and instance config (platform/jobs/workers/registries/alerts). One edge function, one audit trail.

2. **Plugin families, not individual plugins** — `sql.py` handles all JDBC variants. `cloud_storage.py` handles S3/GCS/Azure. Shared base class per family.

3. **Flow-control plugins return plans, not execution** — If/Switch/ForEach return `{"branch": "then"}` or `{"items": [...]}`. The orchestrator handles actual branching. The worker is stateless.

4. **Integration Catalog is the bridge** — Kestra's 821 plugin types are synced to `integration_catalog_items`. Each item maps to a `service_function` in blockdata. This is how Kestra's type system translates to our execution model.

5. **Driver dependencies are optional** — `requirements.txt` includes only core deps (fastapi, httpx, pydantic). Database drivers, cloud SDKs, etc. are installed per-deployment based on which plugin families are enabled. The Dockerfile adds them.