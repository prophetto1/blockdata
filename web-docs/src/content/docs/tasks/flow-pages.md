---
title: "Flow Pages — Task List"
description: "**What exists:**"
---# Flow Pages — Task List

## 1. Flows List Page

| Field | Value |
|---|---|
| Status | **Partial** (40%) |
| Route | `/app/flows` |
| Existing file | `web/src/pages/FlowsList.tsx` (263 lines) |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/flows-00-list.png` |
| Kestra screenshot (ct) | `docs/docs-approved/backend setup/Screenshots/flows-00-list.png` |

**What exists:**
- Basic table with search (case-insensitive)
- Columns: Flow ID, Namespace, Revision, Project, Updated, Action
- Data from `user_projects` table (not flow_sources)
- Synthetic flow generation with MOCK badge

**What's missing (to match Kestra):**
- [ ] Wire data from `flow_sources` table instead of `user_projects`
- [ ] Add columns: Labels (tag chips), Last execution date, Last execution status (state badge), Execution statistics
- [ ] Column sorting (all columns sortable)
- [ ] Pagination UI (25/50/100 per page selector, total count display)
- [ ] Filter section: "Add filters" button, saved filters, clear all
- [ ] Action buttons: "Export as CSV", "Import", "Source search", "+ Create"
- [ ] State badges using Badge component variants (green=SUCCESS, red=FAILED, blue=RUNNING, yellow=WARNING)
- [ ] Row click navigates to flow detail

**Dependencies:** `flow_sources` JSONB table (SQL phase), flows edge function update

---

## 2. Flow Detail — Overview Tab

| Field | Value |
|---|---|
| Status | **Stub** (20%) |
| Route | `/app/flows/:flowId/overview` |
| Existing file | `web/src/pages/FlowDetail.tsx` (412 lines) — overview is inline, not a separate component |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/flows-detail-00.png` |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/flows-tab-01-overview.png` |

**What exists:**
- Tab shell with 11 tabs wired
- 4 stat cards showing "--" (namespace, total executions, success rate, documents)
- Breadcrumb subtitle with flow name

**What's missing (to match Kestra):**
- [ ] Breadcrumb: "Flows / {namespace} / {flow_id}"
- [ ] Action buttons in header: "Edit flow", "Execute" (purple primary CTA)
- [ ] Empty state (no executions yet): hero icon, "Start automating with Kestra" message, Execute CTA, help cards (Get Started, Workflow Components, Video Tutorials)
- [ ] With executions: KPI cards (Success Ratio %, Failed Ratio %, In Progress count, Pending count)
- [ ] Chart: "Total Executions" (duration + count per date, line chart)
- [ ] Chart: "Executions in Progress" (real-time count)
- [ ] Table: "Next Executions" (Namespace, Flow, Next Execution Date)
- [ ] Time interval filter ("Last 24 hours" default)

**Dependencies:** `flow_executions` JSONB table, flow-executions edge function

---

## 3. Flow Detail — Topology Tab

| Field | Value |
|---|---|
| Status | **Partial** (40%) |
| Route | `/app/flows/:flowId/topology` |
| Existing file | `web/src/components/flows/FlowCanvas.tsx` |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/flows-tab-02-topology.png` |

**What exists:**
- ReactFlow canvas component
- Renders dummy/placeholder nodes

**What's missing (to match Kestra):**
- [ ] Parse actual flow YAML into task node graph
- [ ] Render task nodes as white boxes with icons and task ID labels
- [ ] Show trigger nodes at top (green box with "Triggers" label)
- [ ] Vertical dotted connector lines between nodes
- [ ] Canvas controls: zoom +/-, fullscreen toggle, layout grid, download
- [ ] Info button on each task node (shows task details on click)
- [ ] Parallel branches render side-by-side

**Dependencies:** Flow YAML parser (shared with pipeline-worker)

---

## 4. Flow Detail — Executions Tab

| Field | Value |
|---|---|
| Status | **Functional** (60%) |
| Route | `/app/flows/:flowId/executions` |
| Existing file | `web/src/components/flows/tabs/ExecutionsTab.tsx` (145 lines) |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/flows-tab-03-executions.png` |

**What exists:**
- Table with 10 columns: ID, start, end, duration, namespace, flow, labels, state (badge), triggers, actions
- FlowFilterBar UI present
- State badges with correct color mapping

**What's missing (to match Kestra):**
- [ ] Chart area: "Total Executions" line chart (duration and count per date)
- [ ] Wire filter bar: time interval selector ("Last 24 hours"), state filter ("in any"), add filters
- [ ] Applied filters shown as removable chips
- [ ] Row click navigates to execution detail page
- [ ] Pagination with total count
- [ ] "Export as CSV" action

**Dependencies:** `flow_executions` JSONB table, flow-executions edge function

---

## 5. Flow Detail — Edit Tab

| Field | Value |
|---|---|
| Status | **Functional** (75%) |
| Route | `/app/flows/:flowId/edit` |
| Existing file | `web/src/components/flows/FlowWorkbench.tsx` (2,186 lines) |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/flows-tab-04-edit.png` |

**What exists:**
- Advanced split-pane editor (Ark UI Splitter)
- Monaco editor with theme sync
- Tab management: drag-and-drop, context menu, pane resize
- Assets/files panel with document preview
- 7 sub-tabs defined (see editor-subviews.md for details)
- Layout persistence to localStorage

**What's missing (to match Kestra):**
- [ ] Save button with dirty indicator
- [ ] Validation feedback in editor (red underlines, error panel)
- [ ] Autocomplete for flow YAML syntax (task types, properties)
- [ ] Sub-view content for: nocode, documentation, namespace files, blueprints, playground (see editor-subviews.md)

**Dependencies:** Flows edge function (PUT for save)

---

## 6. Flow Detail — Revisions Tab

| Field | Value |
|---|---|
| Status | **Functional** (70%) — has a bug |
| Route | `/app/flows/:flowId/revisions` |
| Existing file | `web/src/components/flows/tabs/RevisionsTab.tsx` (106 lines) |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/flows-tab-05-revisions.png` |

**What exists:**
- Dual-pane side-by-side text view
- Revision selector dropdowns
- Queries `flow_sources` table

**What's missing (to match Kestra):**
- [ ] **BUG FIX:** Query needs `flow_id` filter (migration 069 restructured table but component not updated)
- [ ] Syntax-highlighted diff (not plain text)
- [ ] Change markers (additions green, deletions red)
- [ ] Info banner when only one revision exists
- [ ] Revision metadata: author, timestamp, description

**Dependencies:** `flow_sources` JSONB table

---

## 7. Flow Detail — Triggers Tab

| Field | Value |
|---|---|
| Status | **Functional** (60%) |
| Route | `/app/flows/:flowId/triggers` |
| Existing file | `web/src/components/flows/tabs/TriggersTab.tsx` (94 lines) |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/flows-tab-06-triggers.png` |

**What exists:**
- Table: trigger ID, type, next execution date, enabled/disabled badge
- Search filtering
- "Navigate to edit to add triggers" guidance

**What's missing (to match Kestra):**
- [ ] Columns match Kestra: Id, Type (full plugin type string like `io.kestra.plugin.core.trigger.Schedule`), Next execution date, Backfill toggle
- [ ] "+ Add a trigger" button at bottom
- [ ] Expandable row detail (click row to expand inline)
- [ ] Enable/disable toggle that writes to backend
- [ ] "Backfill executions" link per trigger
- [ ] Inline trigger editing (not just navigate away)

**Dependencies:** `flow_triggers` JSONB table, flow-triggers edge function

---

## 8. Flow Detail — Logs Tab

| Field | Value |
|---|---|
| Status | **Functional** (70%) |
| Route | `/app/flows/:flowId/logs` |
| Existing file | `web/src/components/flows/tabs/LogsTab.tsx` (94 lines) |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/flows-tab-07-logs.png` |

**What exists:**
- Table: timestamp, level badge, task ID, message
- Monospace rendering
- Max 200 results
- FlowFilterBar present

**What's missing (to match Kestra):**
- [ ] Wire filter bar: Log Level filter chip ("INFO" default), time interval ("Last 24 hours")
- [ ] Applied level filter actually filters query results
- [ ] Full-text search across log messages
- [ ] Live tail / auto-refresh (Supabase Realtime subscription)
- [ ] Expandable log entries for long messages
- [ ] Empty state matches Kestra: icon + "No logs found for the selected filters"

**Dependencies:** `flow_execution_logs` JSONB table, flow-execution-logs edge function

---

## 9. Flow Detail — Metrics Tab

| Field | Value |
|---|---|
| Status | **Stub** (5%) |
| Route | `/app/flows/:flowId/metrics` |
| Existing file | `web/src/components/flows/tabs/MetricsTab.tsx` (26 lines) |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/flows-tab-08-metrics.png` |

**What exists:**
- FlowFilterBar only
- Blue info box: "Please choose a metric and an aggregation"

**What's missing (to match Kestra):**
- [ ] Metric name selector dropdown (populated from flow_execution_metrics)
- [ ] Aggregation selector (avg, max, min, sum, count)
- [ ] Time-series chart (line chart of metric_value over time)
- [ ] Filter bar with time interval
- [ ] Table view of raw metric data points
- [ ] Per-task metric breakdown

**Dependencies:** `flow_execution_metrics` JSONB table, flow-metrics edge function

---

## 10. Flow Detail — Dependencies Tab

| Field | Value |
|---|---|
| Status | **Stub** (5%) |
| Route | `/app/flows/:flowId/dependencies` |
| Existing file | `web/src/components/flows/tabs/DependenciesTab.tsx` (10 lines) |
| Kestra screenshot | (Kestra shows this as part of topology, referencing flow_topologies table) |

**What exists:**
- Empty state only: "No dependencies detected. Dependencies will appear here..."

**What's missing (to match Kestra):**
- [ ] Upstream flows list (flows that trigger this flow)
- [ ] Downstream flows list (flows triggered by this flow)
- [ ] Graph visualization of flow dependency chain (ReactFlow)
- [ ] Node click navigates to that flow's detail page
- [ ] Relation type labels on edges

**Dependencies:** `flow_topologies` JSONB table, flow-topologies edge function

---

## 11. Flow Detail — Concurrency Tab

| Field | Value |
|---|---|
| Status | **Stub** (5%) |
| Route | `/app/flows/:flowId/concurrency` |
| Existing file | `web/src/components/flows/tabs/ConcurrencyTab.tsx` (10 lines) |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/flows-tab-09-concurrency.png` |

**What exists:**
- Empty state only: "No limits are set for this Flow..."

**What's missing (to match Kestra):**
- [ ] Empty state matches Kestra: icon + "No limits are set for this Flow." + docs link
- [ ] Form to set concurrency limit (integer input)
- [ ] Display: current running count vs configured limit
- [ ] Save button to persist limit
- [ ] Read more link to documentation

**Dependencies:** `flow_concurrency_limits` JSONB table, flow-concurrency edge function

---

## 12. Flow Detail — Audit Logs Tab

| Field | Value |
|---|---|
| Status | **Locked** (0%) |
| Route | `/app/flows/:flowId/audit-logs` |
| Existing file | `web/src/components/flows/tabs/AuditLogsTab.tsx` (18 lines) |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/flows-tab-10-auditlogs.png` |

**What exists:**
- Enterprise-only badge
- Upsell copy about tracking changes

**What's missing (to match Kestra):**
- [ ] Marketing/info card matching Kestra screenshot: "Track Changes with Audit Logs" with description
- [ ] If implementing: audit log table filtered to state-change events for this flow
- [ ] Columns: timestamp, user, action, old value, new value

**Dependencies:** Decision on whether to implement or keep as upsell

---

## 13. Execution Detail Page

| Field | Value |
|---|---|
| Status | **Missing** (0%) |
| Route | `/app/flows/:flowId/executions/:executionId` |
| Existing file | None — needs to be created |
| Kestra screenshot | (Kestra has this as a deep-dive page reached from Executions tab) |

**What needs to be built:**
- [ ] New page component (e.g., `web/src/pages/ExecutionDetail.tsx`)
- [ ] Add route to `web/src/router.tsx`
- [ ] Task DAG visualization with per-task state coloring (green=success, red=failed, blue=running, gray=pending)
- [ ] Logs panel (filtered to this execution)
- [ ] Metrics panel (filtered to this execution)
- [ ] Inputs/Outputs panel (show flow inputs and task outputs)
- [ ] Gantt chart view (task timeline visualization)
- [ ] State timeline (CREATED -> RUNNING -> SUCCESS with timestamps)
- [ ] Retry/Kill/Pause action buttons
- [ ] Breadcrumb: "Flows / {namespace} / {flowId} / Executions / {executionId}"

**Dependencies:** `flow_executions` + `flow_execution_logs` JSONB tables, flow-executions + flow-execution-logs edge functions

---

## 14. Flow Creation Page/Dialog

| Field | Value |
|---|---|
| Status | **Missing** (0%) |
| Route | Dialog or `/app/flows/new` |
| Existing file | None |
| Kestra screenshot | (Kestra uses "+ Create" button on flows list) |

**What needs to be built:**
- [ ] Create button on Flows List (already mentioned above)
- [ ] Dialog or page with: flow ID input, namespace selector, optional template selection
- [ ] Default YAML scaffold generation (already exists in flows edge function as fallback)
- [ ] Navigate to Edit tab on creation
- [ ] Option to create from blueprint/template

**Dependencies:** Flows edge function (POST for create)
