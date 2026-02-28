# Kestra Phase 2: Execution Engine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the execution engine that turns stored flow YAML into running pipelines with tracked state, logs, and real-time streaming.

**Architecture:** Split into 2a (schema + state machine + YAML parser — all Supabase, no external dependencies) and 2b (task dispatcher — wires to FastAPI when deployed). Phase 2a is fully buildable now. Phase 2b activates when the Ubuntu FastAPI service comes online.

**Tech Stack:** PostgreSQL (state machine, tables), Deno edge functions (API layer), js-yaml (YAML parsing), Supabase Realtime (SSE replacement), existing service_registry/service_functions (task resolution)

---

## Context

Phase 1 delivered: flow YAML storage + revision tracking (`flow_sources`), integration catalog bridge (`integration_catalog_items`), service registry with 12 functions (`service_registry` + `service_functions`), execution tracking tables (`service_runs` + events + artifacts — empty but ready).

Phase 2 builds on this: parse stored YAML into a task DAG, create executions with tracked state, dispatch tasks to registered services, stream updates via Realtime.

**Why split 2a/2b:** Edge functions have a 150s timeout. Multi-step pipelines run minutes to hours. The execution engine cannot be a single long-running edge function. Phase 2a builds everything that doesn't require long-running processes. Phase 2b adds the actual task dispatcher when FastAPI exists as a persistent worker.

---

## Phase 1 Gap to Fill First

The `flows` edge function currently does regex-based YAML parsing (extracts `id`, `namespace`, checks `tasks` exists). Phase 2 requires actual YAML parsing + task graph extraction. This is Task 1 below.

---

## Phase 2a: Schema + State Machine + Parser

### Task 1: YAML Parser + DAG Builder

**Files:**
- Modify: `supabase/functions/flows/index.ts`
- Create: `supabase/functions/_shared/yaml_parser.ts`
- Create: `supabase/functions/_shared/dag.ts`

**What it does:**
- `yaml_parser.ts`: wraps `js-yaml` to parse flow YAML into a typed FlowDefinition object
- `dag.ts`: extracts tasks from FlowDefinition, builds adjacency list from `dependsOn`, topological sorts, detects cycles
- `flows/index.ts`: new route `GET /flows/{namespace}/{id}/graph` returns the parsed DAG (nodes + edges)

**FlowDefinition type:**
```typescript
type FlowTask = {
  id: string;
  type: string;           // e.g. "io.kestra.plugin.scripts.python.Script"
  dependsOn?: string[];
  [key: string]: unknown; // task-specific config
};

type FlowDefinition = {
  id: string;
  namespace: string;
  revision?: number;
  description?: string;
  disabled?: boolean;
  tasks: FlowTask[];
  inputs?: FlowInput[];
  triggers?: FlowTrigger[];
  concurrency?: { limit: number; behavior: "QUEUE" | "CANCEL" | "SKIP" };
  errors?: FlowTask[];
};
```

**DAG output format:**
```typescript
type TaskGraph = {
  nodes: Array<{ taskId: string; type: string; config: Record<string, unknown> }>;
  edges: Array<{ source: string; target: string }>;
  order: string[];  // topological sort result
};
```

**Topological sort:** Kahn's algorithm. If cycle detected, return error with the cycle path.

**Dependency:** `js-yaml` — add to import map or use CDN import (`https://esm.sh/js-yaml@4.1.0`).

---

### Task 2: Execution Tables Migration

**Files:**
- Create: `supabase/migrations/20260228160000_060_executions.sql`

**Tables:**

```sql
-- 1. Executions (flow-level runs)
CREATE TABLE public.executions (
  execution_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id        UUID NOT NULL,              -- references flow_sources.project_id
  namespace      TEXT NOT NULL,
  flow_revision  INT NOT NULL DEFAULT 1,
  state          TEXT NOT NULL DEFAULT 'CREATED'
                   CHECK (state IN (
                     'CREATED','QUEUED','RUNNING','PAUSED',
                     'SUCCESS','FAILED','WARNING',
                     'CANCELLED','KILLING','KILLED',
                     'RETRYING','RESTARTED'
                   )),
  inputs         JSONB DEFAULT '{}',
  outputs        JSONB DEFAULT '{}',
  labels         JSONB DEFAULT '[]',
  trigger_info   JSONB,                      -- which trigger started this
  state_history  JSONB DEFAULT '[]',         -- [{state, date}]
  original_id    UUID,                       -- for restart/replay
  started_at     TIMESTAMPTZ,
  ended_at       TIMESTAMPTZ,
  duration_ms    DOUBLE PRECISION,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_executions_flow_id ON public.executions(flow_id);
CREATE INDEX idx_executions_state ON public.executions(state);
CREATE INDEX idx_executions_namespace ON public.executions(namespace);
CREATE INDEX idx_executions_created_at ON public.executions(created_at DESC);

-- 2. Task runs (per-task within an execution)
CREATE TABLE public.task_runs (
  task_run_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id   UUID NOT NULL REFERENCES public.executions(execution_id) ON DELETE CASCADE,
  task_id        TEXT NOT NULL,              -- from YAML (e.g. "extract")
  task_type      TEXT NOT NULL,              -- from YAML (e.g. "io.kestra.plugin.core.http.Request")
  state          TEXT NOT NULL DEFAULT 'CREATED'
                   CHECK (state IN ('CREATED','RUNNING','SUCCESS','FAILED','WARNING','CANCELLED')),
  outputs        JSONB DEFAULT '{}',
  state_history  JSONB DEFAULT '[]',
  attempt_number INT NOT NULL DEFAULT 1,
  service_run_id UUID REFERENCES public.service_runs(run_id) ON DELETE SET NULL,
  started_at     TIMESTAMPTZ,
  ended_at       TIMESTAMPTZ,
  duration_ms    DOUBLE PRECISION,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_runs_execution ON public.task_runs(execution_id);
CREATE INDEX idx_task_runs_state ON public.task_runs(state);

-- 3. Execution logs
CREATE TABLE public.execution_logs (
  log_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id   UUID NOT NULL REFERENCES public.executions(execution_id) ON DELETE CASCADE,
  task_run_id    UUID REFERENCES public.task_runs(task_run_id) ON DELETE CASCADE,
  level          TEXT NOT NULL DEFAULT 'INFO'
                   CHECK (level IN ('TRACE','DEBUG','INFO','WARN','ERROR')),
  message        TEXT NOT NULL,
  thread         TEXT,
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exec_logs_execution ON public.execution_logs(execution_id);
CREATE INDEX idx_exec_logs_task_run ON public.execution_logs(task_run_id);
CREATE INDEX idx_exec_logs_level ON public.execution_logs(level);

-- 4. Execution metrics
CREATE TABLE public.execution_metrics (
  metric_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id   UUID NOT NULL REFERENCES public.executions(execution_id) ON DELETE CASCADE,
  task_run_id    UUID REFERENCES public.task_runs(task_run_id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('TIMER','COUNTER','GAUGE')),
  value          DOUBLE PRECISION NOT NULL,
  tags           JSONB DEFAULT '{}',
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exec_metrics_execution ON public.execution_metrics(execution_id);
```

**RLS:** Same pattern as migration 050 — read for authenticated, all for service_role.

**Realtime:** Add `executions` and `task_runs` to `supabase_realtime` publication (same pattern as migration 056/059).

**Link to service_runs:** `task_runs.service_run_id` FK connects a task run to its corresponding `service_runs` row when the task maps to a registered service function. This bridges the execution engine to the existing service tracking.

---

### Task 3: State Machine PostgreSQL Functions

**File:** Same migration as Task 2 (or separate `061_execution_functions.sql`)

**Functions:**

```sql
-- Transition execution state with validation
CREATE OR REPLACE FUNCTION public.transition_execution_state(
  p_execution_id UUID,
  p_new_state    TEXT
) RETURNS public.executions AS $$
```

**Valid transitions:**
- CREATED → QUEUED, RUNNING, CANCELLED
- QUEUED → RUNNING, CANCELLED
- RUNNING → SUCCESS, FAILED, WARNING, PAUSED, KILLING, CANCELLED
- PAUSED → RUNNING, CANCELLED
- KILLING → KILLED
- FAILED → RETRYING, RESTARTED

Function appends to `state_history`, sets timing fields (`started_at` on RUNNING, `ended_at` + `duration_ms` on terminal states), updates `updated_at`. Raises exception on invalid transition.

```sql
-- Transition task run state
CREATE OR REPLACE FUNCTION public.transition_task_run_state(
  p_task_run_id UUID,
  p_new_state   TEXT,
  p_outputs     JSONB DEFAULT NULL
) RETURNS public.task_runs AS $$
```

Same pattern: validates transitions, sets timing, appends history. On terminal state (SUCCESS/FAILED), checks if all tasks in the execution are terminal — if so, auto-transitions the execution to SUCCESS or FAILED.

---

### Task 4: Executions Edge Function

**Files:**
- Create: `supabase/functions/executions/index.ts`

**Routes:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/executions/{namespace}/{flowId}` | Create execution — parses flow YAML, builds DAG, inserts execution + task_runs |
| GET | `/executions/{executionId}` | Get execution with task_runs |
| GET | `/executions?namespace={ns}&flowId={id}&state={state}` | List/search executions |
| POST | `/executions/{executionId}/cancel` | Cancel execution (transitions state) |
| POST | `/executions/{executionId}/restart` | Restart from failed execution (creates new execution with original_id) |
| GET | `/executions/{executionId}/logs` | Get execution logs |
| GET | `/executions/{executionId}/graph` | Get execution's task graph with live state overlay |

**Create execution flow:**
1. Load flow YAML from `flow_sources` by flow_id
2. Parse YAML with `yaml_parser.ts`
3. Build task graph with `dag.ts`
4. Insert `executions` row (state: CREATED)
5. Insert `task_runs` rows for each task (state: CREATED)
6. Return execution with task graph

**Auth:** Same pattern as flows — `requireUserId()` + user client.

**Superuser variant:** For admin monitoring, a separate `admin-executions` edge function or admin routes that use `createAdminClient()`.

---

### Task 5: SSE via Supabase Realtime

**No new backend code needed.** Supabase Realtime postgres_changes already handles this.

**Frontend pattern** (same as ServicesPanel.tsx lines 272-294):
```typescript
const channel = supabase.channel('execution-tracker')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'executions',
    filter: `execution_id=eq.${executionId}`
  }, (payload) => { /* update execution state */ })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'task_runs',
    filter: `execution_id=eq.${executionId}`
  }, (payload) => { /* update task run state */ })
  .subscribe();
```

This replaces Kestra's SSE endpoints with Supabase's built-in mechanism. Same real-time behavior, zero custom streaming code.

---

## Phase 2b: Task Dispatcher (when FastAPI exists)

### Task 6: Task Resolution — Map task_type to service_function

**Files:**
- Create: `supabase/functions/_shared/task_resolver.ts`

**Logic:**
1. Given a `task_type` (e.g. `io.kestra.plugin.scripts.python.Script`), look up `integration_catalog_items` for a mapped `function_id`
2. If mapped, load `service_functions` + `service_registry` to get `base_url + entrypoint`
3. If not mapped, check if task_type is a known built-in (Log, If, Switch, ForEach, etc.)
4. Return resolution: `{ resolved: true, service_id, function_id, base_url, entrypoint }` or `{ resolved: false, reason }`

This bridges the integration catalog (Phase 1 deliverable) to the execution engine.

### Task 7: Task Dispatcher Edge Function

**Files:**
- Create: `supabase/functions/execute-task/index.ts`

**Called per-task** (not per-execution). Each task is an independent edge function invocation — no timeout issues.

**Flow:**
1. Receive `{ task_run_id }`
2. Load task_run → get task_type + execution config
3. Resolve task_type to service function (Task 6)
4. Transition task_run to RUNNING
5. Create `service_runs` row (links task_run to service tracking)
6. HTTP call to `base_url + entrypoint` with config as body
7. On response: transition task_run to SUCCESS/FAILED, store outputs
8. Check if next tasks are ready (all dependencies resolved) → dispatch them

**Triggering next tasks:**
- Option A: Edge function calls itself for next tasks (`fetch` to own URL)
- Option B: Use `pg_net` extension to fire HTTP from a DB trigger
- Option C: Client polls/subscribes and triggers next task

Recommend **Option A** for simplicity — the dispatcher calls itself for each ready task. Each call is independent, stays under 150s per task.

### Task 8: Worker Mode (FastAPI long-running)

**Deferred until FastAPI deploys.** When it does:
- FastAPI registers as a service in `service_registry` with real `base_url`
- Task dispatcher sends HTTP to FastAPI endpoint
- FastAPI runs dlt/dbt/python tasks (no timeout limit)
- Reports completion back via Supabase service_role API
- Edge function remains the API gateway; FastAPI is the worker

---

## Task Dependency Order

```
Task 1 (YAML parser + DAG)
  ↓
Task 2 (DB schema)
  ↓
Task 3 (state machine functions)
  ↓
Task 4 (executions edge function)
  ↓
Task 5 (frontend Realtime — can start after Task 2)
  ↓
Task 6 (task resolver — can start after Task 2)
  ↓
Task 7 (dispatcher — needs Task 3 + 4 + 6)
  ↓
Task 8 (FastAPI — deferred)
```

Tasks 1-5 = Phase 2a (buildable now).
Tasks 6-8 = Phase 2b (needs running services).

---

## Files Modified / Created

| File | Action | Phase |
|------|--------|-------|
| `supabase/functions/_shared/yaml_parser.ts` | Create | 2a |
| `supabase/functions/_shared/dag.ts` | Create | 2a |
| `supabase/functions/flows/index.ts` | Modify — add `/graph` route | 2a |
| `supabase/migrations/20260228160000_060_executions.sql` | Create | 2a |
| `supabase/functions/executions/index.ts` | Create | 2a |
| `supabase/functions/_shared/task_resolver.ts` | Create | 2b |
| `supabase/functions/execute-task/index.ts` | Create | 2b |

---

## Verification

### Phase 2a
1. `POST /flows/validate` with valid Kestra YAML (tasks + dependsOn) returns no violations
2. `GET /flows/{ns}/{id}/graph` returns `{ nodes, edges, order }` with correct topological sort
3. Cycle in dependsOn returns error with cycle path
4. `POST /executions/{ns}/{flowId}` with inputs creates execution (state: CREATED) + N task_runs
5. `GET /executions/{id}` returns execution with all task_runs and states
6. `SELECT * FROM executions` shows row; `SELECT * FROM task_runs` shows N rows
7. `SELECT transition_execution_state(id, 'RUNNING')` succeeds; invalid transition raises error
8. Supabase Realtime: subscribe to `executions` table, transition state → receive change event
9. `GET /executions?namespace=test&state=CREATED` returns filtered list
10. `npm run build` passes

### Phase 2b
11. Task resolver maps `io.kestra.plugin.core.log.Log` → built-in handler
12. Task resolver maps mapped catalog item → correct service_function
13. Dispatcher executes single task, creates service_runs row, transitions task_run to SUCCESS
14. Multi-task execution: tasks run in topological order, each completes before dependents start
15. Failed task → execution transitions to FAILED, remaining tasks stay CREATED