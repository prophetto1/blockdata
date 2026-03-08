---
title: Implementation Task Inventory
description: Complete enumeration of all activities required to build the Kestra-inspired flow runtime, organized by area with dependency markers.
---

## How to Read This

Each task has:
- **ID**: For cross-referencing dependencies
- **Deps**: Tasks that must complete first (blank = no dependency, can start immediately)
- **Area**: Which skill domain the task requires
- **Parallelizable**: Whether it can run alongside other tasks in the same area

---

## Area 1: SQL Foundation (Migrations + Utility Functions)

These create the database layer. Must complete before edge functions or frontend can wire to real data.

| ID | Task | Deps | Parallelizable | Notes |
|---|---|---|---|---|
| S1 | Create `fulltext_index(text)` and `fulltext_search(text)` functions | — | Yes | Port from Kestra. Used by every JSONB table with search. |
| S2 | Create `parse_iso8601_datetime(text)` and `parse_iso8601_duration(text)` functions | — | Yes | Used by generated columns in executions, logs, metrics, triggers. |
| S3 | Create `flow_state_type` enum | — | Yes | Subset of Kestra's 17 states. Start with: CREATED, QUEUED, RUNNING, PAUSED, SUCCESS, WARNING, FAILED, KILLED, CANCELLED, RETRYING. |
| S4 | Create `flow_log_level` enum | — | Yes | ERROR, WARN, INFO, DEBUG, TRACE. |
| S5 | Create `state_fromtext(text)` and `log_level_fromtext(text)` cast functions | S3, S4 | Yes | Safe casts for generated columns. |
| S6 | Expand `flow_sources` table (or replace with `flows` table) | S1 | No | Add `key`, `value JSONB`, generated `flow_id`, `namespace`, `revision`, `deleted`, `fulltext`, `owner_id`. Keep `source_code TEXT`. Add all indexes. Migrate existing data. Composite key for multiple flows per project. |
| S7 | Create `flow_executions` table | S1, S2, S3, S5 | Yes (after deps) | JSONB + generated columns: `flow_id`, `namespace`, `state_current`, `state_duration`, `start_date`, `end_date`, `owner_id`, `trigger_execution_id`. All 10 indexes. RLS. |
| S8 | Create `flow_execution_logs` table | S1, S2, S4, S5 | Yes (after deps) | JSONB + generated columns: `execution_id`, `task_id`, `taskrun_id`, `level`, `timestamp`, `attempt_number`, `trigger_id`. Short key VARCHAR(30). 6 indexes. RLS. |
| S9 | Create `flow_triggers` table | S1, S2 | Yes (after deps) | JSONB + generated columns: `flow_id`, `trigger_id`, `next_execution_date`, `execution_id`, `disabled`, `owner_id`. RLS. |
| S10 | Create `flow_execution_metrics` table | S1, S2 | Yes (after deps) | JSONB + generated columns: `execution_id`, `task_id`, `metric_name`, `metric_value`, `timestamp`. Short key VARCHAR(30). RLS. |
| S11 | Create `flow_topologies` table | S1 | Yes (after deps) | JSONB + generated columns: `source_namespace`, `source_id`, `relation`, `destination_namespace`, `destination_id`, `owner_id`. Bidirectional indexes. RLS. |
| S12 | Create `flow_concurrency_limits` table | S1 | Yes (after deps) | JSONB + generated columns: `flow_id`, `namespace`, `running`, `owner_id`. RLS. |
| S13 | Write RLS policies for all new tables | S6-S12 | No | Consistent pattern: `owner_id = auth.uid()` for SELECT, INSERT, UPDATE, DELETE. |
| S14 | Run security advisors check | S13 | No | Verify no missing RLS, no exposed functions. |

**Critical path:** S1-S5 (utility functions + enums) must land first, then S6-S12 can be parallelized, then S13-S14.

---

## Area 2: Edge Functions (CRUD + Dispatch)

These are the API layer between frontend and database. Depend on SQL tables existing.

| ID | Task | Deps | Parallelizable | Notes |
|---|---|---|---|---|
| E1 | `flows` edge function — CRUD for flow definitions | S6 | Yes | Create/read/update/delete flow definitions. Handles source_code + value JSONB. Revision auto-increment on update. Soft delete. |
| E2 | `flow-executions` edge function — create + query executions | S7 | Yes | POST to create execution (writes initial CREATED state). GET with filters (flow_id, state, date range). Pagination. |
| E3 | `flow-execution-logs` edge function — query logs | S8 | Yes | GET with filters (execution_id, task_id, level, timestamp range). Streaming support for live tailing. |
| E4 | `flow-triggers` edge function — CRUD for triggers | S9 | Yes | Create/update/delete trigger definitions. Enable/disable. Query by flow_id. |
| E5 | `flow-metrics` edge function — query metrics | S10 | Yes | GET with filters (execution_id, task_id, metric_name, timestamp range). Aggregation support (avg, max, min over time). |
| E6 | `flow-topologies` edge function — query dependencies | S11 | Yes | GET upstream/downstream flows. Accept flow_id, return graph edges. |
| E7 | `flow-concurrency` edge function — manage limits | S12 | Yes | GET/PUT concurrency limits per flow. |
| E8 | `flow-dispatch` edge function — execute a flow | S7, S8 | No | The critical path. Accepts flow_id, creates execution record, parses flow YAML, resolves tasks to service_functions, dispatches to pipeline-worker, writes initial log entries. |
| E9 | `flow-execution-status` edge function — update execution state | S7, S8 | No | Called by pipeline-worker as tasks complete. Updates execution state, writes log entries, updates metrics. Handles state transitions (RUNNING->SUCCESS, RUNNING->FAILED, etc). |
| E10 | Wire Nango connection retrieval into dispatch | E8 | No | When a task references a provider connection, fetch current tokens from Nango API before dispatching to pipeline-worker. |

**Critical path:** E1-E7 can all parallelize once their table deps are met. E8-E10 are sequential and form the execution backbone.

---

## Area 3: Python Handlers (Pipeline-Worker)

These execute the actual tasks. Depend on the dispatch edge function contract being defined.

| ID | Task | Deps | Parallelizable | Notes |
|---|---|---|---|---|
| P1 | Define handler interface contract for flow task execution | E8 (contract only) | No | Document: what the pipeline-worker receives (task definition, params, connection creds, execution context), what it returns (result, logs, metrics, state). |
| P2 | Extend `BasePlugin` to support execution context | P1 | No | Add execution_id, task_id, attempt_number to plugin context. Add log_entry() and metric_entry() methods that write back to Supabase. |
| P3 | Implement flow YAML parser | — | Yes | Parse Kestra-compatible YAML into a task DAG. Resolve task types to service_function references. Handle inputs, outputs, conditional logic. |
| P4 | Implement DAG executor | P1, P3 | No | Walk the parsed DAG. Execute tasks in dependency order. Handle parallel branches. Write state transitions to flow_executions. |
| P5 | Implement callback endpoint for task completion | P2 | Yes | HTTP endpoint on pipeline-worker that edge functions can call, or that pipeline-worker calls to Supabase to report task_run completion. |
| P6 | Port core task handlers from Kestra schemas | P2 | Yes | Using `integration_catalog_items` metadata: `io.kestra.plugin.core.log.Log`, `io.kestra.plugin.core.flow.If`, `io.kestra.plugin.core.flow.Switch`, `io.kestra.plugin.core.flow.ForEach`, `io.kestra.plugin.core.flow.Parallel`, `io.kestra.plugin.core.flow.Sequential`, `io.kestra.plugin.core.flow.Pause`, `io.kestra.plugin.core.flow.Sleep`. Most already exist in `plugins/core.py`. |
| P7 | Port HTTP task handlers | P2 | Yes | `io.kestra.plugin.core.http.Request`, `io.kestra.plugin.core.http.Download`, `io.kestra.plugin.core.http.Trigger`. Extend existing `plugins/http.py`. |
| P8 | Port script task handlers | P2 | Yes | `io.kestra.plugin.scripts.python.Script`, `io.kestra.plugin.scripts.shell.Script`, `io.kestra.plugin.scripts.node.Script`. Extend existing `plugins/scripts.py`. |
| P9 | Port database/JDBC handlers (priority group) | P2 | Yes | Using SQLAlchemy. Start with: PostgreSQL, MySQL, BigQuery. Map from `io.kestra.plugin.jdbc.*` schemas in catalog. |
| P10 | Port cloud storage handlers (priority group) | P2 | Yes | Using boto3/google-cloud-storage/azure-storage-blob. Start with: S3 Upload/Download, GCS Upload/Download. Map from `io.kestra.plugin.aws.s3.*` and `io.kestra.plugin.gcp.gcs.*`. |
| P11 | Port notification handlers | P2 | Yes | Slack, email, webhook. Map from `io.kestra.plugin.notifications.*`. |
| P12 | Implement Nango credential injection | P2, E10 | No | When a task needs provider credentials, pipeline-worker calls Nango API to get current tokens, injects them into the task context. |
| P13 | Add handler auto-discovery for new plugin groups | P6-P11 | No | Update `registry.py` to scan new plugin directories. Register task_type -> handler mappings. |

**Critical path:** P1 (contract) -> P2 (base class) -> P4 (DAG executor). P3, P6-P11 can parallelize independently.

---

## Area 4: Frontend — Flow Detail Tabs

These wire the existing tab stubs to real data. Depend on edge functions existing.

| ID | Task | Deps | Parallelizable | Notes |
|---|---|---|---|---|
| F1 | Create shared `useFlowQuery` hook | E1 | No | Supabase query hook for flow data. Handles loading, error, refetch. Used by all tabs. |
| F2 | Wire ExecutionsTab to `flow-executions` edge function | E2, F1 | Yes | Real data: execution list with state badges, duration, start/end dates. Filter by state. Click to expand. |
| F3 | Wire LogsTab to `flow-execution-logs` edge function | E3, F1 | Yes | Real data: log entries with level coloring, timestamp, task scope. Filter by level. Auto-scroll to latest. |
| F4 | Wire TriggersTab to `flow-triggers` edge function | E4, F1 | Yes | Real data: trigger list with next_execution_date, enabled/disabled toggle, last execution link. |
| F5 | Wire MetricsTab to `flow-metrics` edge function | E5, F1 | Yes | Real data: metric values over time. Basic chart or table view. Filter by metric_name. |
| F6 | Wire DependenciesTab to `flow-topologies` edge function | E6, F1 | Yes | Real data: upstream/downstream flow graph. Render with XyFlow or simple list. |
| F7 | Wire ConcurrencyTab to `flow-concurrency` edge function | E7, F1 | Yes | Real data: current limit, running count, form to update limit. |
| F8 | Wire RevisionsTab to expanded flow_sources revision history | E1, F1 | Yes | Already partially implemented. Wire to real revision data from JSONB value. Diff view between revisions. |
| F9 | Wire AuditLogsTab to flow_execution_logs (filtered to audit events) | E3, F1 | Yes | Subset of logs filtered to state-change events. |

---

## Area 5: Frontend — New Pages

New routes and pages that don't exist yet.

| ID | Task | Deps | Parallelizable | Notes |
|---|---|---|---|---|
| N1 | Flow execution detail page (`/app/flows/:flowId/executions/:executionId`) | F2 | No | Full execution view: task DAG with per-task state, logs panel, metrics panel, inputs/outputs. Similar to Kestra's execution detail. |
| N2 | Flow creation wizard / new flow page | E1 | Yes | Create new flow with YAML editor or template selection. Save to flow_sources. |
| N3 | Flow blueprints/templates page | — | Yes | Browse pre-built flow templates from integration_catalog. Click to fork into user's project. |
| N4 | Global executions list page (`/app/executions`) | E2 | Yes | Cross-flow execution overview. All recent executions with state, flow name, duration. Filterable. |
| N5 | Global logs page (`/app/logs`) | E3 | Yes | Cross-flow log viewer. Real-time log streaming. Filter by flow, execution, level. |
| N6 | KV Store page (`/app/kv`) | — | Yes | Key-value store viewer and editor. Uses existing KV components in `web/src/components/kv/`. Needs backend table (future). |
| N7 | Namespace file browser page | — | Yes | Browse and manage files associated with a namespace/flow. Needs backend table (future). |

---

## Area 6: Frontend — Design System Compliance

Ensure all new and updated components follow the established contracts.

| ID | Task | Deps | Parallelizable | Notes |
|---|---|---|---|---|
| D1 | Audit all new components against icon contract | F2-F9, N1-N5 | Yes | Use icons from approved icon set only. No inline SVGs. |
| D2 | Audit all new components against color contract | F2-F9, N1-N5 | Yes | Use CSS variables from theme.css. No hardcoded colors. |
| D3 | Audit all new components against typography contract | F2-F9, N1-N5 | Yes | Use font tokens from styleTokens.ts. |
| D4 | Audit all new components against toolbar button spec | F2-F9, N1-N5 | Yes | Any toolbar actions follow the toolbar contract. |
| D5 | Add new components to UI catalog page | F2-F9, N1-N5 | Yes | Register in UiCatalog.tsx for visual review. |
| D6 | Update component-inventory.json | F2-F9, N1-N5 | No | Keep the inventory current with new components. |

---

## Area 7: Integration + Wiring

Cross-cutting tasks that connect the areas together.

| ID | Task | Deps | Parallelizable | Notes |
|---|---|---|---|---|
| I1 | Add flow runtime tables to `web/src/lib/tables.ts` | S6-S12 | No | Single source of truth for table names. Add: flow_executions, flow_execution_logs, flow_triggers, flow_execution_metrics, flow_topologies, flow_concurrency_limits. |
| I2 | Generate TypeScript types from new schema | S6-S12 | No | Run Supabase type generation. Update `web/src/lib/types.ts`. |
| I3 | Wire flow dispatch button in FlowWorkbench | E8, F1 | No | "Run" button in the flow editor that calls flow-dispatch edge function. Shows execution state in real time. |
| I4 | Wire Supabase Realtime subscriptions for execution updates | S7, F2 | No | Subscribe to flow_executions changes for live state updates in the Executions tab. |
| I5 | Wire Supabase Realtime for log streaming | S8, F3 | No | Subscribe to flow_execution_logs inserts for live log tailing in the Logs tab. |
| I6 | Add flow-related routes to app router | N1-N5 | No | Register new pages in the route config. |
| I7 | Update left-rail navigation for new pages | N1-N5 | No | Add Executions, Logs as top-level nav items if appropriate. |
| I8 | End-to-end smoke test: create flow -> execute -> view results | E8, N1, P4 | No | The integration proof point. Full cycle from YAML to execution to logs to metrics in the UI. |

---

## Area 8: Documentation + Knowledge Layer

Keep the docs site current as implementation proceeds.

| ID | Task | Deps | Parallelizable | Notes |
|---|---|---|---|---|
| K1 | Document the flow YAML schema | P3 | No | What fields are valid in a flow definition. Task types, inputs, outputs, triggers, conditions. |
| K2 | Document the execution lifecycle | P4, E8 | No | State machine: CREATED -> QUEUED -> RUNNING -> SUCCESS/FAILED. What triggers each transition. |
| K3 | Document the handler contract | P1, P2 | No | How to write a new Python handler. Interface, context, return types, logging, metrics. |
| K4 | Document the edge function API | E1-E9 | No | REST API reference for all flow-related endpoints. Request/response schemas. |
| K5 | Write getting-started guide for flow creation | I8 | No | End-to-end tutorial. Requires the smoke test to pass first. |

---

## Summary Counts

| Area | Tasks | Can Start Immediately | Blocked Until |
|---|---|---|---|
| SQL Foundation | 14 | 5 (S1-S5) | — |
| Edge Functions | 10 | 0 | SQL tables |
| Python Handlers | 13 | 1 (P3) | Handler contract |
| Frontend Tabs | 9 | 0 | Edge functions |
| Frontend Pages | 7 | 2 (N3, N6) | Edge functions |
| Design Compliance | 6 | 0 | Frontend components |
| Integration | 8 | 0 | Cross-area deps |
| Documentation | 5 | 0 | Implementation |

**Total: 72 tasks**

## Dependency Graph (Simplified)

```
S1-S5 (enums + functions)
  |
  v
S6-S12 (tables, parallel)  +  P3 (YAML parser, independent)
  |                             |
  v                             v
S13-S14 (RLS + security)   P1 (handler contract)
  |                             |
  v                             v
E1-E7 (CRUD functions,     P2 (base class extension)
  parallel)                     |
  |                             v
  v                         P4 (DAG executor)  +  P6-P11 (handlers, parallel)
E8-E10 (dispatch chain)        |
  |                             |
  +-------- merge --------------+
  |
  v
I1-I2 (types + table names)
  |
  v
F1 (shared hook)
  |
  v
F2-F9 (tabs, parallel)  +  N1-N5 (pages, parallel)
  |                             |
  v                             v
I3-I7 (wiring)             D1-D6 (design audit)
  |
  v
I8 (end-to-end smoke test)
  |
  v
K1-K5 (documentation)
```
