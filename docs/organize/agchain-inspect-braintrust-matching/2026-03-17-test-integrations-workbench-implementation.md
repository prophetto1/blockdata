# Test-Integrations Workbench — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the superuser workbench for absorbing ~150 Kestra plugins (~1000+ functions) into the BlockData execution plane — a unified `Task.run(RunContext) → Output` framework backed by 6 abstract base pattern adapters, with a browser UI for viewing Kestra specs, scaffolding implementations, testing, and tracking absorption progress.

**Architecture:** Two halves. (1) **Execution framework** — extend blockdata-io's existing `Task`/`RunContext`/`WorkerTask` runtime with abstract base adapters for each pattern family (HTTP API, JDBC, SDK, CLI, Message Queue, Flow). Each concrete function is a thin subclass (~10-30 lines) that configures the base. (2) **Workbench UI** — a superuser page that reads the Kestra catalog from Supabase, shows specs alongside the runner, dispatches tests through blockdata-io's subprocess executor, and tracks absorption progress.

**Tech Stack:** Python dataclasses + blockdata-io runtime (backend framework). React + Workbench + CodeEditorSurface + function-reference components (frontend). Supabase for catalog, test cases, run history.

**Date:** 2026-03-17
**Repos:** blockdata-io (execution framework + backend), writing-system/web (workbench UI), writing-system/supabase (migrations)

---

## Why This Exists

BlockData has 945 Kestra catalog entries across ~150 plugin families representing ~1000+ functions. These need to be absorbed into a **single Python execution framework** — not hand-wired individually. The current state is:

- **~53 BD-native functions** are operational but ad-hoc — each wired differently (edge functions, platform-api plugins, CLI wrappers). Not systematic.
- **~890 catalog entries** have full Kestra specs (parameter schemas, output schemas, examples) registered in `service_functions` but with Kestra class paths as entrypoints — not callable.
- **8 MongoDB functions** in blockdata-io are the only ones translated through the `Task.run(RunContext)` pattern. This pattern IS the framework — it just needs to generalize.

The workbench exists to make absorption efficient: view the Kestra spec → scaffold an implementation against the correct base pattern → test it → track progress. Without it, each function is a manual translation project. With it, functions within the same pattern family are configuration, not code.

## The Execution Framework

### Pattern Family Taxonomy (data-verified)

Every function in the catalog falls into one of these families. Each family gets one abstract base adapter in `blockdata/connectors/`.

| # | Pattern Family | Functions | Services | Base Adapter | What it does |
|---|---|---|---|---|---|
| 1 | **HTTP API** (SaaS connectors) | 349 | 88 | `AbstractHttpTask` | Build request (URL, method, headers, auth, body) → call external API → parse response. Covers Airtable, Algolia, HubSpot, Shopify, Stripe, Slack, Zendesk, Notion, Jira, etc. |
| 2 | **Cloud SDK** (AWS/Azure/GCP) | 192 | 5 | `AbstractCloudSdkTask` | Import cloud SDK (boto3/azure-sdk/google-cloud) → authenticate → call service method → return result. Covers S3, Lambda, DynamoDB, Blob Storage, BigQuery, etc. |
| 3 | **JDBC/SQL** (databases) | 75 | 21 | `AbstractJdbcTask` | Connect via connection string → execute SQL → return rows. Covers PostgreSQL, MySQL, Snowflake, ClickHouse, DuckDB, Redshift, and 15 more DB variants. |
| 4 | **NoSQL/Search SDK** | 70 | 13 | `AbstractNoSqlTask` | Import SDK → connect → execute operation (find/insert/update/delete/search) → return result. Covers MongoDB (already done), Elasticsearch, Redis, Neo4j, Cassandra, etc. |
| 5 | **Flow primitives** | 68 | 1 | `AbstractFlowTask` | Orchestration control — evaluate conditions, manage control flow. If, Switch, ForEach, Parallel, Sequential, Pause, Sleep. No external call. |
| 6 | **Filesystem** (FTP/SFTP/SSH) | 51 | 1 | `AbstractFileSystemTask` | Connect to remote filesystem → list/read/write/move/delete files. Protocol-specific adapters (FTP, SFTP, SSH, local). |
| 7 | **Message queues** | 35 | 7 | `AbstractMessageQueueTask` | Connect to broker → publish or consume messages → return results. Covers Kafka, AMQP, MQTT, NATS, Pulsar, SQS, Event Hubs. |
| 8 | **CLI/Script** | 32 | 17 | `AbstractCliTask` | Build command → run in subprocess → capture stdout/stderr → parse output. Covers dbt, Ansible, Terraform, shell/Python/Node scripts. |
| 9 | **AI/LLM API** | 24 | 9 | `AbstractAiTask` | Call LLM provider API → return completion/embedding/classification. Covers OpenAI, Anthropic, Gemini, Ollama, Mistral, etc. |
| 10 | **CDC** (Debezium) | 18 | 6 | `AbstractCdcTask` | Connect to change stream → capture changes → return events. Database-specific CDC adapters. |

**Total catalog: ~914 functions across 10 pattern families.**

### How the Framework Extends blockdata-io

The existing runtime already has the right primitives:

```
blockdata/
├── core/
│   ├── models/
│   │   ├── tasks/task.py          # Task base + RunnableTask protocol ← KEEP AS-IS
│   │   ├── property.py            # Property<T> deferred rendering ← KEEP AS-IS
│   │   └── flows/state.py         # State enum ← KEEP AS-IS
│   └── runners/
│       ├── run_context.py         # RunContext (render, working_dir, metrics) ← KEEP AS-IS
│       └── run_context_initializer.py  # ← KEEP AS-IS
├── worker/
│   ├── runner.py                  # run_worker_task() ← KEEP AS-IS
│   ├── worker_task.py             # WorkerTask ← KEEP AS-IS
│   └── worker_task_result.py      # WorkerTaskResult ← KEEP AS-IS
├── runtime/
│   ├── execution.py               # execute_function() ← EXPAND (Task 13)
│   ├── registry.py                # register_all() ← GENERALIZE (Task 11)
│   ├── connection.py              # resolve_connection_sync() ← EXPAND (Task 12)
│   └── routes.py                  # POST /plugins/{fn} ← EXPAND (Task 13)
├── connectors/
│   ├── mongodb/                   # EXISTING — 8 functions, AbstractTask pattern
│   │   ├── abstract_task.py       #   connection + database + collection fields
│   │   ├── find.py, aggregate.py, etc.  # thin subclasses of AbstractTask
│   │   └── mongodb_connection.py  #   MongoDbConnection → MongoClient
│   ├── http/                      # NEW — AbstractHttpTask
│   ├── jdbc/                      # NEW — AbstractJdbcTask
│   ├── cloud/                     # NEW — AbstractCloudSdkTask
│   ├── mq/                        # NEW — AbstractMessageQueueTask
│   ├── cli/                       # NEW — AbstractCliTask
│   ├── ai/                        # NEW — AbstractAiTask
│   ├── fs/                        # NEW — AbstractFileSystemTask
│   ├── flow/                      # NEW — AbstractFlowTask
│   └── cdc/                       # NEW — AbstractCdcTask
└── workbench/                     # NEW — workbench API
    ├── routes.py                  # /workbench endpoints
    ├── manifest.py                # file manifest builder
    ├── subprocess_runner.py       # standalone execution script
    └── runner.py                  # subprocess invocation
```

### What a Concrete Function Looks Like

MongoDB `Find` already demonstrates the pattern — `abstract_task.py:1-22` is the base, `find.py` is ~40 lines of config + logic. The same pattern scales to every family.

**HTTP API example** (Airtable List Records — one of 349 HTTP API functions):

```python
# blockdata/connectors/http/airtable/list_records.py
@dataclass(slots=True, kw_only=True)
class AirtableListRecords(AbstractHttpTask):
    base_id: Property[str]
    table_name: Property[str]
    filter_formula: Property[str] | None = None
    max_records: Property[int] | None = None
    fields: Property[list[str]] | None = None

    def build_request(self, ctx: RunContext) -> HttpRequest:
        base = ctx.render(self.base_id).as_type(str).or_else_throw()
        table = ctx.render(self.table_name).as_type(str).or_else_throw()
        params = {}
        if self.filter_formula:
            params["filterByFormula"] = ctx.render(self.filter_formula).as_type(str).value
        if self.max_records:
            params["maxRecords"] = ctx.render(self.max_records).as_type(int).value
        return HttpRequest(
            method="GET",
            url=f"https://api.airtable.com/v0/{base}/{table}",
            params=params,
            auth_header=f"Bearer {self.resolve_credential(ctx, 'apiKey')}",
        )
```

**JDBC example** (PostgreSQL Query — one of 75 SQL functions):

```python
# blockdata/connectors/jdbc/postgresql/query.py
@dataclass(slots=True, kw_only=True)
class PostgresqlQuery(AbstractJdbcTask):
    sql: Property[str]
    fetch_type: Property[str] = Property.of_value("FETCH")

    def get_driver(self) -> str:
        return "postgresql"  # → psycopg2 or asyncpg

    def build_query(self, ctx: RunContext) -> str:
        return ctx.render(self.sql).as_type(str).or_else_throw()
```

Each concrete function is **configuration of its base adapter**, not a from-scratch implementation. The base adapter handles connection, auth, error handling, output serialization, and metrics. The concrete function says what to call and how to map the params.

### Connection Resolution

`connection.py` currently only handles `CONNECTION_{id}_{field}` env vars. It needs to support the auth patterns across all families:

| Auth Pattern | Used By | Resolution |
|---|---|---|
| Connection string / URI | MongoDB, JDBC, AMQP, Redis | `CONNECTION_{id}_URI` env var → pass to SDK |
| API key in header | Airtable, Algolia, Stripe, OpenAI, Anthropic | `CONNECTION_{id}_API_KEY` → `Authorization: Bearer {key}` |
| OAuth2 client credentials | HubSpot, Salesforce, Microsoft 365 | `CONNECTION_{id}_CLIENT_ID` + `_CLIENT_SECRET` → token exchange |
| Service account JSON | GCP, Firebase | `CONNECTION_{id}_SERVICE_ACCOUNT_KEY` → path to JSON file |
| Access key + secret | AWS (S3, Lambda, etc.) | `CONNECTION_{id}_ACCESS_KEY` + `_SECRET_KEY` |
| Username + password | JDBC, FTP, SFTP, LDAP | `CONNECTION_{id}_USERNAME` + `_PASSWORD` |
| No auth | Local filesystem, in-memory DBs | No credentials needed |

The `resolve_connection_sync()` function already supports arbitrary `CONNECTION_{id}_{field}` lookups. The base adapters call it to get whatever fields their auth pattern requires. No changes needed to the resolution mechanism — the adapters just know which fields to ask for.

---

## What Already Exists

### Data Layer (Supabase)

**Implemented functions:**
- `service_registry` — services with `base_url`, `execution_plane`, `health_status`, `config`, `auth_config`
- `service_functions` — all functions (both operational and catalog-only) with `parameter_schema[]`, `entrypoint`, `http_method`, `result_schema`, `source_task_class`, `plugin_group`
- `service_runs` — execution history: `status`, `config_snapshot`, `result`, `error_message`, `duration_ms`

**Kestra absorption catalog:**
- `integration_catalog_items` (945 rows) — `task_class`, `task_schema`, `mapped_service_id`, `mapped_function_id`
- `kestra_plugin_inputs` (~9700 rows) — per-parameter specs
- `kestra_plugin_outputs` (~2300 rows) — per-output-field specs
- `kestra_plugin_examples` (~1451 rows) — example invocations (test case seeds)
- `kestra_plugin_definitions` (~4400 rows) — reusable type definitions
- `kestra_provider_enrichment` (~56 rows) — provider metadata

**Key distinction:** Most `service_functions` rows with `service_type = 'integration'` have `base_url` set to a Kestra class path (e.g., `io.kestra.plugin.aws`) and `entrypoint` set to the Java task class (e.g., `io.kestra.plugin.aws.s3.Upload`). These are **not callable via HTTP** — they're catalog registrations. The workbench must distinguish "executable" (real base_url) from "spec-only" (Kestra class path).

### Frontend Components (writing-system/web)

- `web/src/components/workbench/Workbench.tsx` — multi-pane layout, drag-drop tabs, localStorage persistence
- `web/src/pages/superuser/CodeEditorSurface.tsx` — CodeMirror 6, Python/JS/YAML, diff view
- `web/src/components/services/function-reference.tsx` — `FunctionReferenceHeader` + `FunctionReferenceBody`
- `web/src/pages/marketplace/FunctionCatalogPage.tsx` — `inferRole()`/`inferOperation()` + badge colors
- `web/src/pages/marketplace/ServiceDetailPage.tsx` — three-column service detail (prior art)
- `web/src/lib/edge.ts` — `edgeFetch()` for Supabase Edge Functions
- `web/src/lib/platformApi.ts` — `platformApiFetch()` for platform-api
- `web/src/pages/settings/services-panel.types.ts` — `ServiceRow`, `ServiceFunctionRow`, `ParamDef`

### Infrastructure (already done this session)

- Vite proxy: `/blockdata-api` → `localhost:8100` (`web/vite.config.ts`)
- blockdata-io: `lifespan` context manager, `get_task_types()` public accessor
- Route: `/app/superuser/test-integrations` behind `SuperuserGuard`
- Nav: superuser drill menu entry

---

## Workbench UI Layout

```
┌─────────────────────────┬──────────────────────────────┬──────────────────────────┐
│  LEFT (≈22%)            │  CENTER (≈48%)               │  RIGHT (≈30%)            │
│                         │                              │                          │
│  [Functions] [Cases]    │  [Runner] [Spec] [Source]    │  [Output] [Dashboard]    │
│                         │                              │                          │
│  Pattern: [All ▼]       │  ── Runner tab ──            │  ── Output tab ──        │
│  Service: [All ▼]       │  fn: airtable_list_records   │  state: SUCCESS ✓        │
│  Status: [All ▼]        │  pattern: HTTP API           │  duration: 342ms         │
│  Search: [_________]    │  base: AbstractHttpTask      │  output: { ... }         │
│                         │                              │  error: null             │
│  HTTP API (349)         │  Parameters:                 │                          │
│  ├ Airtable (5)         │  ┌─────────────────────┐     │  verdict: PASS           │
│  │ ● list_records  ✓    │  │ base_id: [appXYZ]   │     │                          │
│  │ ● get_record    ✓    │  │ table_name: [Users]  │     │  ── Dashboard tab ──     │
│  │ ○ create        —    │  │ max_records: [100]   │     │                          │
│  ├ Algolia (3)          │  └─────────────────────┘     │  Absorption Progress     │
│  │ ○ search        —    │  Connection: AIRTABLE        │  ━━━━━░░░░░░░░░░░  5%    │
│  ├ HubSpot (16)         │  [▶ Run]  [Save as Case]    │  53 of 967 executable    │
│  ...                    │                              │                          │
│  JDBC (75)              │  ── Spec tab ──              │  By Pattern:             │
│  ├ PostgreSQL (6)       │  Kestra: io.kestra.plugin.   │  HTTP API   0/349   ○    │
│  ├ MySQL (4)            │    airtable.records.List     │  Cloud SDK  0/192   ○    │
│  ...                    │  Inputs: (9 params)          │  JDBC       0/75    ○    │
│  Cloud SDK (192)        │    apiKey: String (required)  │  NoSQL/SDK  8/70    ◐    │
│  ...                    │    baseId: String (required)  │  Flow       0/68    ○    │
│                         │    tableName: String (req'd) │  FS         0/51    ○    │
│  ── Cases tab ──        │  Outputs: (2 fields)          │  MQ         0/35    ○    │
│  airtable_list_records: │    records: Array<Object>    │  CLI/Script 0/32    ○    │
│    basic-list    ✓      │    size: Integer              │  AI/LLM     0/24    ○    │
│    filtered      ✓      │  Examples: (2)                │  CDC        0/18    ○    │
│                         │    "List all records"         │  BD-native  53/53   ✓    │
└─────────────────────────┴──────────────────────────────┴──────────────────────────┘
```

**Key interactions:**

- **Filter by pattern family** — see all 75 JDBC functions together, all 349 HTTP API functions, etc.
- **Filter by status** — "not implemented" shows what to work on next, "failing" shows what's broken
- **Spec tab** — Kestra contract (inputs/outputs/examples) for the selected function, regardless of implementation status. This is the build spec.
- **Runner tab** — parameter form built from `parameter_schema`. Only active for implemented functions with real endpoints. For catalog-only functions, shows "Not yet implemented — scaffold from Spec tab."
- **Source tab** — for blockdata-io connectors, shows Python source via workbench API. For others, shows entrypoint + schema as reference.
- **Dashboard** — absorption progress grouped by pattern family, because that's how the work is structured: implement one base adapter → all functions in that family become thin subclasses.

---

## Phases

### Phase 1 — Workbench UI Shell + Data Hooks (writing-system/web)

#### Task 1: useServiceFunctions hook

**Files:**
- Create: `web/src/pages/superuser/test-integrations/useServiceFunctions.ts`

**Step 1:** Create hook that fetches `service_registry` + `service_functions` from Supabase, joins them, and adds a computed `is_executable` flag (true when `base_url` does NOT start with `io.kestra.plugin.`) and a computed `pattern_family` string derived from `service_type` + `base_url` (using the taxonomy from this plan).

```typescript
// web/src/pages/superuser/test-integrations/useServiceFunctions.ts
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type ServiceSummary = {
  service_id: string;
  service_name: string;
  service_type: string;
  base_url: string;
  execution_plane: string;
  health_status: string;
};

export type FunctionWithService = {
  function_id: string;
  service_id: string;
  function_name: string;
  function_type: string;
  label: string | null;
  description: string | null;
  entrypoint: string | null;
  http_method: string;
  parameter_schema: any[];
  result_schema: any;
  tags: string[];
  source_task_class: string | null;
  plugin_group: string | null;
  service_name: string;
  base_url: string;
  execution_plane: string;
  is_executable: boolean;
  pattern_family: string;
};

const KESTRA_MQ = ['amqp','kafka','mqtt','nats','pulsar','solace','jms'];
const KESTRA_NOSQL = ['mongodb','elasticsearch','opensearch','neo4j','couchbase','surrealdb','documentdb','cassandra','redis','influxdb','weaviate','typesense','meilisearch'];
const KESTRA_AI = ['ai','openai','anthropic','gemini','ollama','deepseek','mistral','perplexity','huggingface'];
const KESTRA_CLOUD = ['aws','azure','gcp','googleworkspace','microsoft365'];

function inferPatternFamily(serviceType: string, baseUrl: string): string {
  if (!baseUrl.startsWith('io.kestra.plugin.')) {
    return `BD-native (${serviceType})`;
  }
  const group = baseUrl.replace('io.kestra.plugin.', '').split('.')[0];
  if (baseUrl.includes('.jdbc.')) return 'JDBC';
  if (baseUrl.includes('.scripts.') || group === 'scripts') return 'CLI/Script';
  if (baseUrl.includes('.debezium.')) return 'CDC';
  if (group === 'core') return 'Flow primitives';
  if (group === 'fs') return 'Filesystem';
  if (group === 'compress' || group === 'serdes') return 'Utility';
  if (KESTRA_MQ.includes(group)) return 'Message queue';
  if (KESTRA_NOSQL.includes(group)) return 'NoSQL/Search SDK';
  if (KESTRA_AI.includes(group)) return 'AI/LLM API';
  if (KESTRA_CLOUD.includes(group)) return 'Cloud SDK';
  return 'HTTP API';
}

export function useServiceFunctions() {
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [functions, setFunctions] = useState<FunctionWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const [svcRes, fnRes] = await Promise.all([
        supabase
          .from('service_registry')
          .select('service_id, service_type, service_name, base_url, execution_plane, health_status')
          .eq('enabled', true)
          .order('service_name'),
        supabase
          .from('service_functions')
          .select('function_id, service_id, function_name, function_type, label, description, entrypoint, http_method, parameter_schema, result_schema, tags, source_task_class, plugin_group, service:service_registry!inner(service_name, service_type, base_url, execution_plane)')
          .eq('enabled', true)
          .order('function_name'),
      ]);

      if (cancelled) return;
      if (svcRes.error) { setError(svcRes.error.message); setLoading(false); return; }
      if (fnRes.error) { setError(fnRes.error.message); setLoading(false); return; }

      const svcData = (svcRes.data ?? []) as ServiceSummary[];
      setServices(svcData);

      const fnData = (fnRes.data ?? []).map((row: any) => {
        const baseUrl = row.service?.base_url ?? '';
        const serviceType = row.service?.service_type ?? '';
        return {
          ...row,
          service_name: row.service?.service_name ?? '',
          base_url: baseUrl,
          execution_plane: row.service?.execution_plane ?? '',
          is_executable: !baseUrl.startsWith('io.kestra.plugin.'),
          pattern_family: inferPatternFamily(serviceType, baseUrl),
          service: undefined,
        } as FunctionWithService;
      });

      setFunctions(fnData);
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const patternCounts = useMemo(() => {
    const counts = new Map<string, { total: number; executable: number }>();
    for (const fn of functions) {
      const entry = counts.get(fn.pattern_family) ?? { total: 0, executable: 0 };
      entry.total++;
      if (fn.is_executable) entry.executable++;
      counts.set(fn.pattern_family, entry);
    }
    return counts;
  }, [functions]);

  return { services, functions, loading, error, patternCounts };
}
```

**Step 2:** Verify: `cd e:/writing-system/web && npx tsc --noEmit 2>&1 | head -5`

**Step 3:** Commit.

---

#### Task 2: useKestraCatalog hook

**Files:**
- Create: `web/src/pages/superuser/test-integrations/useKestraCatalog.ts`

Loads the Kestra absorption catalog and provides on-demand spec loading (inputs/outputs/examples) for any catalog entry.

**Step 1:** Create hook — see previous plan revision for full code. Key function: `loadCatalogSpec(itemId)` that fetches from `kestra_plugin_inputs`, `kestra_plugin_outputs`, `kestra_plugin_examples` for a specific item.

**Step 2:** Verify TypeScript compiles.

**Step 3:** Commit.

---

#### Task 3: useTestExecution hook

**Files:**
- Create: `web/src/pages/superuser/test-integrations/useTestExecution.ts`

Dispatches execution for **executable** functions only. Routes through the correct path based on `execution_plane` and `base_url`. For blockdata-io connectors, uses the Vite proxy at `/blockdata-api/plugins/`. Writes results to `service_runs`.

**Step 1:** Create hook. Critical: check `fn.is_executable` before dispatching. If not executable, return error "Function not yet implemented — catalog entry only."

**Step 2:** Verify TypeScript compiles.

**Step 3:** Commit.

---

#### Task 4: Three-column Workbench page shell

**Files:**
- Modify: `web/src/pages/superuser/TestIntegrations.tsx`

7 tabs across 3 panes: Left (Functions, Cases), Center (Runner, Spec, Source), Right (Output, Dashboard). Placeholders for each tab.

**Step 1:** Replace current content with Workbench shell using the tab/pane config from the layout diagram above.

**Step 2:** Verify at `http://localhost:5274/app/superuser/test-integrations`.

**Step 3:** Commit.

---

### Phase 2 — Left Panel: Function Browser + Test Cases

#### Task 5: Wire function list with pattern family grouping

**Files:**
- Modify: `web/src/pages/superuser/TestIntegrations.tsx`

**Step 1:** Functions tab shows:
- Pattern family filter dropdown (HTTP API, JDBC, Cloud SDK, etc.) with counts
- Service filter dropdown (within selected pattern)
- Status filter: All / Executable / Spec-only
- Search input
- Function list grouped by service, showing: function_name, label, pattern badge, status badge (✓ passing / ◐ partial / ✗ failing / ○ untested / — not implemented)

**Step 2:** Click function → sets `selectedFunction` state. This drives Runner, Spec, Source, and Output tabs.

**Step 3:** Commit.

---

#### Task 6: Supabase migration for workbench_test_cases

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_workbench_test_cases.sql`

**Step 1:** Write migration (see previous revision for full SQL). Table: `case_id`, `function_id`, `case_name`, `params`, `expected_status`, `assertions`, `last_run_id`, `last_verdict`, `created_by`.

**Step 2:** Apply migration.

**Step 3:** Commit.

---

#### Task 7: useTestCases hook + Cases tab

**Files:**
- Create: `web/src/pages/superuser/test-integrations/useTestCases.ts`
- Modify: `web/src/pages/superuser/TestIntegrations.tsx`

**Step 1:** CRUD hook against `workbench_test_cases`.

**Step 2:** Cases tab: list cases for selected function, verdict badges, "New Case" button, delete button.

**Step 3:** Commit.

---

### Phase 3 — Center Panel: Runner + Spec + Source

#### Task 8: Runner tab — parameter form + execution

**Files:**
- Modify: `web/src/pages/superuser/TestIntegrations.tsx`

**Step 1:** For **executable** functions: build parameter form from `parameter_schema`. Each param → input field based on `type` (string → text, number → number, boolean → checkbox, array/object → JSON textarea). Show param description, required badge, default value. Run button dispatches via `useTestExecution`. "Save as Case" button.

**Step 2:** For **spec-only** functions: show "Not yet implemented" message with the pattern family and a note: "This function needs a `{PatternFamily}` adapter implementation in blockdata-io. See the Spec tab for the Kestra contract."

**Step 3:** Show function metadata header: function_name, service_name, pattern_family badge, execution_plane, entrypoint, is_executable status.

**Step 4:** Commit.

---

#### Task 9: Spec tab — Kestra source contract

**Files:**
- Modify: `web/src/pages/superuser/TestIntegrations.tsx`

This is the build reference. Shows the Kestra contract so you know what to implement.

**Step 1:** Look up `source_task_class` on selected function → find matching `integration_catalog_items` entry → call `loadCatalogSpec(itemId)`.

**Step 2:** Render:
- Header: task_class, task_title, task_description, plugin_group, pattern_family
- Inputs table: param_name, param_type, required, default, description
- Outputs table: output_name, output_type, required, description
- Examples: collapsible code blocks with syntax highlighting
- "Seed Test Case" button on each example → pre-fills Runner params

**Step 3:** If no catalog entry found, show "No Kestra spec available for this function."

**Step 4:** Commit.

---

#### Task 10: Source tab — code viewer

**Files:**
- Modify: `web/src/pages/superuser/TestIntegrations.tsx`

**Step 1:** For blockdata-io connectors: fetch Python source via `/blockdata-api/workbench/source/...` → display in `CodeEditorSurface` with Python syntax. Read-only for MVP.

**Step 2:** For other executable functions: show entrypoint, parameter_schema, result_schema as read-only reference.

**Step 3:** For spec-only functions: show "Implementation needed" with the base adapter class name and a skeleton example for that pattern family.

**Step 4:** Commit.

---

### Phase 4 — Right Panel: Output + Dashboard

#### Task 11: Output tab — execution result display

**Files:**
- Modify: `web/src/pages/superuser/TestIntegrations.tsx`

**Step 1:** Show last execution result: status badge (complete/failed/running), duration_ms, result JSON (collapsible), error message. Verdict for test case runs (pass/fail/error).

**Step 2:** Recent runs list for selected function from `service_runs` (last 10).

**Step 3:** Commit.

---

#### Task 12: Dashboard tab — absorption progress tracker

**Files:**
- Create: `web/src/pages/superuser/test-integrations/useDashboard.ts`
- Modify: `web/src/pages/superuser/TestIntegrations.tsx`

**Step 1:** Dashboard aggregates by **pattern family** — this is the critical framing because absorption work is structured by pattern: implement one base adapter → all functions in that family become thin subclasses.

```
Absorption Progress                    ━━━░░░░░░░░░░░░░  5%   (53 / 967)

Pattern Family        Implemented    Tested    Passing
────────────────────────────────────────────────────────
HTTP API (SaaS)           0 / 349       0          0    ○
Cloud SDK (AWS/Az/GCP)    0 / 192       0          0    ○
JDBC (SQL databases)      0 / 75        0          0    ○
NoSQL/Search SDK          8 / 70        8          8    ◐
Flow primitives           0 / 68        0          0    ○
Filesystem (FTP/SFTP)     0 / 51        0          0    ○
Message queues            0 / 35        0          0    ○
CLI/Script runners        0 / 32        0          0    ○
AI/LLM API                0 / 24        0          0    ○
CDC (Debezium)            0 / 18        0          0    ○
BD-native                53 / 53       12         10    ◐
```

**Step 2:** The dashboard makes it clear: implement `AbstractHttpTask` → unlock 349 functions. Implement `AbstractJdbcTask` → unlock 75. Each base adapter is high-leverage work.

**Step 3:** Also show: total `service_functions` count, total `integration_catalog_items` count, mapped count (where `mapped_function_id IS NOT NULL`).

**Step 4:** Commit.

---

### Phase 5 — blockdata-io Backend: Framework + Workbench API

#### Task 13: Generalize registry.py for dynamic plugin loading

**Files:**
- Modify: `blockdata/runtime/registry.py`

**Step 1:** Currently `_TASK_TYPES` is hardcoded to 8 MongoDB classes. Change `register_all()` to scan `blockdata/connectors/` for any module that exports a `Task` subclass. Keep the explicit `_TASK_TYPES` dict as a fallback but add auto-discovery.

**Step 2:** Existing tests must still pass — MongoDB functions still register the same way.

**Step 3:** Commit.

---

#### Task 14: Expand connection.py for multi-pattern auth

**Files:**
- Modify: `blockdata/runtime/connection.py`

**Step 1:** `resolve_connection_sync()` already supports arbitrary `CONNECTION_{id}_{field}` lookups. Add a helper `resolve_connection_dict(connection_id) → dict` that returns ALL `CONNECTION_{id}_*` env vars as a dict. Base adapters call this and extract the fields they need.

**Step 2:** Commit.

---

#### Task 15: Expand ExecutionResult + PluginResponse

**Files:**
- Modify: `blockdata/runtime/execution.py`
- Modify: `blockdata/runtime/routes.py`
- Modify: tests

**Step 1:** Stop raising RuntimeError on FAILED. Return full WorkerTaskResult fields (state, duration_ms, metrics, error) through ExecutionResult and PluginResponse. (Same as original plan Task 1 — unchanged.)

**Step 2:** Commit.

---

#### Task 16: Workbench package — manifest + source + subprocess runner

**Files:**
- Create: `blockdata/workbench/__init__.py`
- Create: `blockdata/workbench/routes.py`
- Create: `blockdata/workbench/manifest.py`
- Create: `blockdata/workbench/subprocess_runner.py`
- Create: `blockdata/workbench/runner.py`
- Modify: `main.py`

**Step 1:** `manifest.py` — `build_manifest(plugin_name)` uses `get_task_types()` + `inspect.getsourcefile()` to derive file paths. Infers roles from class hierarchy generically. `validate_source_path()` for traversal protection.

**Step 2:** `routes.py`:
- `GET /workbench/` → health
- `GET /workbench/manifest/{plugin_name}` → manifest
- `GET /workbench/source/{file_path:path}` → source read
- `POST /workbench/run/{function_name}` → subprocess execution

**Step 3:** `subprocess_runner.py` + `runner.py` — subprocess isolation model (same as original plan).

**Step 4:** Mount router in `main.py` lifespan. Call `rebuild_known_files()` at startup.

**Step 5:** Commit.

---

#### Task 17: AbstractHttpTask — first base adapter (unlocks 349 functions)

**Files:**
- Create: `blockdata/connectors/http/__init__.py`
- Create: `blockdata/connectors/http/abstract_http_task.py`

**Step 1:** Create the base adapter.

```python
# blockdata/connectors/http/abstract_http_task.py
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import httpx

from blockdata.core.models.property import Property
from blockdata.core.models.tasks.task import Task
from blockdata.core.runners.run_context import RunContext
from blockdata.runtime.connection import resolve_connection_sync


@dataclass(slots=True, kw_only=True)
class HttpRequest:
    method: str = "GET"
    url: str = ""
    headers: dict[str, str] = field(default_factory=dict)
    params: dict[str, Any] = field(default_factory=dict)
    body: Any = None
    auth_header: str | None = None


@dataclass(slots=True, kw_only=True)
class HttpOutput:
    status_code: int
    body: Any
    headers: dict[str, str]
    size: int = 0


@dataclass(slots=True, kw_only=True)
class AbstractHttpTask(Task):
    """Base adapter for HTTP API connectors (349 functions).

    Subclasses implement build_request() to configure the HTTP call.
    The base handles: auth header injection, request execution, error handling,
    response parsing, and output serialization.
    """
    connection: dict | None = None
    connection_id: str | None = None
    content_type: str = "application/json"
    timeout_seconds: Property[int] = Property.of_value(30)

    def build_request(self, ctx: RunContext) -> HttpRequest:
        """Override in subclass to configure the HTTP request."""
        raise NotImplementedError

    def parse_response(self, response: httpx.Response) -> Any:
        """Override to customize response parsing. Default: JSON."""
        if response.headers.get("content-type", "").startswith("application/json"):
            return response.json()
        return response.text

    def resolve_credential(self, ctx: RunContext, field_name: str) -> str:
        """Resolve a credential field from the connection."""
        if self.connection and field_name in self.connection:
            return str(self.connection[field_name])
        if self.connection_id:
            creds = resolve_connection_sync(self.connection_id)
            return str(creds.get(field_name, ""))
        return ""

    def run(self, run_context: RunContext) -> HttpOutput:
        req = self.build_request(run_context)
        timeout = run_context.render(self.timeout_seconds).as_type(int).or_else(30)

        headers = {**req.headers}
        if req.auth_header:
            headers["Authorization"] = req.auth_header
        if req.body is not None and "Content-Type" not in headers:
            headers["Content-Type"] = self.content_type

        with httpx.Client(timeout=timeout) as client:
            response = client.request(
                method=req.method,
                url=req.url,
                headers=headers,
                params=req.params or None,
                json=req.body if isinstance(req.body, (dict, list)) else None,
                content=req.body if isinstance(req.body, (str, bytes)) else None,
            )
            response.raise_for_status()

        parsed = self.parse_response(response)
        return HttpOutput(
            status_code=response.status_code,
            body=parsed,
            headers=dict(response.headers),
            size=len(response.content),
        )
```

**Step 2:** Write test: create a minimal subclass that calls a test endpoint, verify it returns HttpOutput.

**Step 3:** Commit.

---

#### Task 18: AbstractJdbcTask — second base adapter (unlocks 75 functions)

**Files:**
- Create: `blockdata/connectors/jdbc/__init__.py`
- Create: `blockdata/connectors/jdbc/abstract_jdbc_task.py`

**Step 1:** Create base adapter. Connection via `connection_id` → resolves `CONNECTION_{id}_URI`. Executes SQL, returns rows.

**Step 2:** Write test with SQLite (no external dependency).

**Step 3:** Commit.

---

### Phase 6 — Polish

#### Task 19: Loading states + error handling

**Step 1:** Loading spinners for all async operations.
**Step 2:** Error states: unreachable service, auth failure, function not found.
**Step 3:** Auto-refresh cases after run. Auto-switch to Output tab on Run.
**Step 4:** Commit.

---

## Pre-requisites Before Starting

1. **Verify Supabase access** — `service_registry` and `service_functions` are populated
2. **Set up venv in blockdata-io** — `python -m venv .venv && .venv/Scripts/pip install -e ".[dev]"`
3. **Verify blockdata-io tests pass** — `.venv/Scripts/python -m pytest tests/ -v`
4. **Verify web dev server** — `cd web && npm run dev` on port 5274

## Key Principle

**The base adapter is the unit of leverage.** Implementing `AbstractHttpTask` unlocks 349 functions. `AbstractJdbcTask` unlocks 75. `AbstractCloudSdkTask` unlocks 192. Each concrete function is ~10-30 lines of configuration on top of its base. The workbench makes this visible: the Dashboard groups by pattern family so you can see that one base adapter implementation unblocks an entire category. The Spec tab shows the Kestra contract so each thin subclass can be written against the spec. The Runner tests it immediately.

This is not a function-by-function grind. It's 10 base adapters × N thin subclasses = 1000+ functions.
