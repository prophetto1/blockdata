---
title: "Kestra Runtime And Frontend Two-Branch Implementation Plan"
description: "> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task."
---# Kestra Runtime And Frontend Two-Branch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the BlockData frontend and backend needed to support Kestra-style flow runtime data, live integrations and service pages, and the preparation pipeline for generating Python handlers from Kestra Java plugins.

**Architecture:** Run two parallel branches with three workers each. Branch A builds the canonical backend contract in Supabase and the execution bridge to `pipeline-worker`. Branch B builds the frontend surfaces on top of those contracts, reusing the current app shell, flow pages, settings admin, and marketplace structure instead of creating disconnected new experiences.

**Tech Stack:** Supabase Postgres, Supabase Edge Functions, SQL migrations, React 19, TypeScript, Vite, Tailwind CSS, Ark UI, shadcn/ui, FastAPI `pipeline-worker`, Kestra schema exports, Java plugin metadata, Python code generation prep.

---

## Non-Negotiable Decisions

1. **Supabase remains the system of record.** We borrow Kestra's JSONB plus generated-columns storage pattern, but we do not query Kestra's live database directly from the app at runtime.
2. **Frontend contracts must fit the current shell.** New pages live under `web/src/pages/` and route through the existing `AppLayout`, `FlowsRouteShell`, marketplace routes, and settings layout.
3. **No new design system.** Follow `docs/design-system.md`: no Mantine, tokens from `web/src/tailwind.css`, Ark-first where appropriate, and prefer local component styles where the repo already does so.
4. **Do not widen scope to Kestra internals you do not need.** Skip queues, executor state, dashboards, SLA monitors, and other scheduler internals until the runtime tabs and handler prep pipeline are live.
5. **Normalize before generating handlers.** The Python-handler work must consume BlockData-owned normalized plugin specs, not raw ad hoc reads from exported SQL files.

---

## Branch And Worker Layout

### Branch A: `feature/kestra-runtime-foundation`

This branch owns the database contract, execution bridge, and handler-preparation pipeline.

| Worker | Scope | Owns |
|---|---|---|
| A1 | Flow runtime schema | `supabase/migrations/20260306*_069_*`, `070_*`, `071_*` |
| A2 | Execution bridge and runtime writes | `supabase/functions/execute-task/**`, `supabase/functions/admin-flow-runtime/**`, backend contract docs |
| A3 | Plugin normalization and Python-handler prep | `supabase/migrations/20260306*_072_*`, `073_*`, `services/pipeline-worker/app/routes/**`, generation-prep docs |

### Branch B: `feature/kestra-frontend-surfaces`

This branch owns the routed UI, admin pages, and handler-readiness pages.

| Worker | Scope | Owns |
|---|---|---|
| B1 | Flow list/detail/editor runtime surfaces | `web/src/pages/FlowsList.tsx`, `web/src/pages/FlowDetail.tsx`, `web/src/components/flows/**`, new flow API helpers |
| B2 | Live integrations and admin mapping surfaces | `web/src/pages/marketplace/**`, `web/src/pages/settings/**`, new integrations API helpers |
| B3 | Handler readiness, plugin docs browser, and execution launch UI | new `web/src/pages/settings/Handler*`, shared schema form components, plugin detail surfaces |

### Merge Order

1. A1 lands first.
2. A2 and A3 can land after A1.
3. B1 depends on A1.
4. B2 depends on A1 and partially on A3.
5. B3 depends on A3 and the shared schema/runtime contracts from A1 and A2.

---

## Phase 0: Shared Contract Lock Before Worker Split

Do this before any of the six workers start coding.

### Task 0.1: Verify canonical table and view names

**Files:**
- Read: `docs-approved/backend setup/backend-direction.md`
- Read: `docs/plans/2026-03-04-kestra-plugins-to-services-migration.md`
- Read: `docs/database-refactor/2026-03-03-table-rename-map.yaml`

**Why this exists:**
The repo currently mixes names like `service_registry` vs `registry_services` and `integration_catalog_items` vs renamed targets in the database refactor package. Do not let six workers code against mixed names.

**Output:**
- A one-page contract note committed to `docs/plans/2026-03-06-kestra-runtime-contract-lock.md`
- Canonical answers for:
  - runtime write tables
  - read views exposed to frontend
  - plugin catalog source table or view
  - provider enrichment source table or view

**Acceptance criteria:**
- Every worker prompt references the same table and view names.
- No migration in this plan targets both pre-rename and post-rename names.

---

## Branch A: Runtime Foundation

## Worker A1: Flow Runtime Schema

### Task A1.1: Add Kestra-style helper enums and functions

**Files:**
- Create: `supabase/migrations/20260306120000_069_kestra_runtime_helpers.sql`

**Implement:**
- `log_level` enum
- `flow_state_type` enum or reuseable `state_type`
- helper SQL functions:
  - `fulltext_replace(text, text)`
  - `fulltext_index(text)`
  - `fulltext_search(text)`
  - `parse_iso8601_datetime(text)`
  - `parse_iso8601_duration(text)`
  - `state_fromtext(text)`
  - `loglevel_fromtext(text)`

**Important adaptation:**
- Replace Kestra `tenant_id` projections with `owner_id` or project-owned equivalents compatible with Supabase RLS.
- Keep the JSONB document as `value`.

### Task A1.2: Replace the current one-flow-per-project model with real flow definitions

**Files:**
- Create: `supabase/migrations/20260306121000_070_flow_definitions.sql`

**Create or replace with canonical tables:**
- `flow_definitions`
- `flow_definition_revisions` if revision history is split out
- `flow_topologies`
- `flow_triggers`
- `flow_concurrency_limits`

**Required columns on `flow_definitions`:**
- `key`
- `value jsonb`
- generated columns for:
  - `flow_id`
  - `namespace`
  - `revision`
  - `deleted`
  - `owner_id`
  - `project_id`
  - `updated_at`
- separate `source_code text`
- labels JSONB indexing support

**Do not:**
- keep `project_id` as the sole primary key
- assume only one flow per project

### Task A1.3: Create flow runtime event tables for the existing tabs

**Files:**
- Create: `supabase/migrations/20260306122000_071_flow_runtime_tables.sql`

**Create:**
- `flow_executions`
- `flow_execution_logs`
- `flow_execution_metrics`
- `flow_execution_queue`

**Model them after the Kestra exports in** `docs-approved/backend setup/kestra-sqls/*.txt`, but adapt:
- `tenant_id` → `owner_id`
- use UUID-friendly keys where useful, but preserve a stable `key`
- keep generated columns for all tab filters:
  - execution state
  - start/end dates
  - trigger execution id
  - log level
  - task id
  - metric name/value/timestamp

### Task A1.4: Add read views and RLS

**Files:**
- Create: `supabase/migrations/20260306123000_072_flow_runtime_views_and_rls.sql`

**Create:**
- `view_flow_definitions`
- `view_flow_executions`
- `view_flow_execution_logs`
- `view_flow_execution_metrics`
- `view_flow_triggers`

**RLS requirements:**
- Owner-scoped reads for user-visible rows
- Admin-safe policies for system and settings surfaces
- No direct frontend dependency on raw tables if a stable view can be provided

**Acceptance criteria for Worker A1:**
- The flow detail tabs each have a concrete backend source.
- Multiple flows per project are possible.
- Search and filtering columns are indexable without client-side JSON walking.

---

## Worker A2: Execution Bridge And Runtime Writes

### Task A2.1: Add a single dispatch RPC for plugin or function resolution

**Files:**
- Create: `supabase/migrations/20260306124000_073_resolve_execution_targets.sql`

**Create SQL functions:**
- `resolve_task_endpoint(p_task_class text)`
- `resolve_flow_execution_target(p_flow_id text or uuid)`

**The resolution path must support:**
- plugin task class → mapped function → service base URL + entrypoint
- flow run request → flow definition + execution bootstrap data

### Task A2.2: Create the execution bridge edge function

**Files:**
- Create: `supabase/functions/execute-task/index.ts`
- Create: `supabase/functions/admin-flow-runtime/index.ts`

**`execute-task` responsibilities:**
- authenticate caller
- resolve target endpoint
- insert `flow_executions` and possibly `service_runs`
- POST to `pipeline-worker` or another registered service
- update runtime rows on success or failure
- write `flow_execution_logs` and `service_run_events`

**`admin-flow-runtime` responsibilities:**
- list flow runtime summaries for admin pages
- expose filters used by tabs
- expose trigger/concurrency management endpoints if direct table access is undesirable

### Task A2.3: Wire `pipeline-worker` to return runtime-friendly metadata

**Files:**
- Modify: `services/pipeline-worker/app/main.py`
- Modify: `services/pipeline-worker/app/shared/output.py`
- Modify: `services/pipeline-worker/app/shared/context.py`
- Modify: `services/pipeline-worker/openapi.json`

**Required outputs:**
- normalized state
- structured logs
- metrics payloads
- per-task result document
- optional artifacts metadata

**Acceptance criteria for Worker A2:**
- A frontend caller can execute a mapped plugin through one endpoint.
- A successful run creates consistent execution, log, and result rows.
- Failures write structured error rows, not only HTTP error text.

---

## Worker A3: Plugin Normalization And Python Handler Preparation

### Task A3.1: Create normalized plugin-spec tables

**Files:**
- Create: `supabase/migrations/20260306125000_074_plugin_handler_preparation.sql`

**Create:**
- `plugin_catalog_specs`
- `plugin_parameter_specs`
- `plugin_output_specs`
- `python_handler_families`
- `python_handler_specs`
- `python_handler_generation_runs`

**Purpose:**
- normalize raw Kestra plugin metadata into BlockData-owned tables
- make parameter and output contracts queryable
- track generation readiness by plugin family and individual task class

### Task A3.2: Add an importer from Kestra exports into normalized specs

**Files:**
- Create: `supabase/functions/import-kestra-specs/index.ts`
- Optionally create: `services/pipeline-worker/app/routes/plugin_specs.py`

**Importer sources:**
- `docs-approved/backend setup/kestra-sqls/kestra_schema.sql`
- `docs-approved/backend setup/kestra-sqls/flows_definition.txt`
- `docs-approved/backend setup/kestra-sqls/executions_definition.txt`
- live Kestra API from `docs-approved/backend setup/kestra-access.md`

**Normalize:**
- task class
- plugin group
- input fields
- output fields where derivable
- examples
- markdown docs
- handler family

### Task A3.3: Add handler-readiness derivation and stub generation prep

**Files:**
- Modify: `services/pipeline-worker/app/registry.py`
- Modify: `services/pipeline-worker/app/plugins/__init__.py`
- Create: `services/pipeline-worker/app/routes/admin_handlers.py`
- Create: `docs/internal/kestra-handler-generation-contract.md`

**Readiness states:**
- `untriaged`
- `family-mapped`
- `spec-normalized`
- `stub-generated`
- `implemented`
- `verified`
- `blocked`

**Family mapping examples:**
- core flow tasks → `core.py`
- HTTP tasks → `http.py`
- script tasks → `scripts.py`
- SQL tasks → future `sql.py`
- storage tasks → future `storage.py`

**Acceptance criteria for Worker A3:**
- The repo has a normalized source of truth for handler generation.
- The frontend can query which plugins are ready, mapped, or blocked.
- Stub generation is driven from normalized specs, not manual copy-paste from Java.

---

## Branch B: Frontend Surfaces

## Worker B1: Flow Runtime Pages

### Task B1.1: Replace synthetic flow listing with real flow data

**Files:**
- Modify: `web/src/pages/FlowsList.tsx`
- Create: `web/src/pages/flows/flows.api.ts`
- Create: `web/src/pages/flows/flows.types.ts`

**Use:**
- `view_flow_definitions`
- runtime summary aggregates from A1

**Must support:**
- namespace
- latest revision
- last execution state
- search and filter

### Task B1.2: Finish flow detail tabs against new runtime tables

**Files:**
- Modify: `web/src/pages/FlowDetail.tsx`
- Modify: `web/src/components/flows/tabs/ExecutionsTab.tsx`
- Modify: `web/src/components/flows/tabs/LogsTab.tsx`
- Modify: `web/src/components/flows/tabs/MetricsTab.tsx`
- Modify: `web/src/components/flows/tabs/TriggersTab.tsx`
- Modify: `web/src/components/flows/tabs/DependenciesTab.tsx`
- Modify: `web/src/components/flows/tabs/ConcurrencyTab.tsx`
- Modify: `web/src/components/flows/tabs/AuditLogsTab.tsx`

**Do not keep placeholder-grade data paths.**

### Task B1.3: Align the editor with the new flow definition model

**Files:**
- Modify: `web/src/components/flows/FlowWorkbench.tsx`
- Modify: `web/src/components/flows/flowWorkbenchState.ts`
- Modify: `web/src/router.tsx`

**Requirements:**
- load and save by `flow_id` and `namespace`
- support multiple flows per project
- keep current pane/tab persistence behavior
- do not break the current shell or routed detail view

**Acceptance criteria for Worker B1:**
- `/app/flows` and `/app/flows/:flowId/:tab?` are backed by real flow data.
- The flow editor persists against the new schema.
- Every runtime tab has a live data source or a true empty state.

---

## Worker B2: Live Integrations And Admin Mapping

### Task B2.1: Replace static integrations catalog with live data

**Files:**
- Replace: `web/src/pages/marketplace/IntegrationsCatalog.tsx`
- Create: `web/src/pages/marketplace/integrations.api.ts`
- Create: `web/src/pages/marketplace/IntegrationProviderDetail.tsx`
- Modify: `web/src/router.tsx`

**New routes:**
- `/app/marketplace/integrations`
- `/app/marketplace/integrations/:providerSlug`

**Data source:**
- canonical plugin catalog view from A3
- provider enrichment view from Phase 0 contract lock

### Task B2.2: Add an admin integrations mapping surface

**Files:**
- Modify: `web/src/pages/settings/settings-nav.ts`
- Modify: `web/src/pages/settings/SettingsAdmin.tsx`
- Create: `web/src/pages/settings/IntegrationMappingsPanel.tsx`
- Create: `web/src/pages/settings/integration-mappings.api.ts`

**Capabilities:**
- search plugins
- inspect normalized input and output specs
- map plugin to service/function
- show readiness state
- show last generation run or block reason

### Task B2.3: Keep services and integrations visually aligned

**Files:**
- Modify: `web/src/pages/marketplace/ServicesCatalog.tsx`
- Modify: `web/src/pages/marketplace/ServiceDetailPage.tsx`
- Reuse: `web/src/components/marketplace/MarketplaceGrid.tsx`

**Goal:**
- one consistent marketplace language for services and integrations
- no static-data-only branch left behind

**Acceptance criteria for Worker B2:**
- The integrations marketplace is live.
- Admins can map plugins to executable functions from the UI.
- Marketplace pages reuse the current shell and marketplace patterns.

---

## Worker B3: Handler Readiness, Plugin Browser, And Launch UI

### Task B3.1: Build a schema-driven task form layer

**Files:**
- Create: `web/src/components/plugins/PluginSchemaForm.tsx`
- Create: `web/src/components/plugins/plugin-schema.ts`
- Create: `web/src/components/plugins/usePluginSpec.ts`

**Purpose:**
- render normalized parameter specs from A3
- support defaults, enums, required fields, descriptions
- become the shared input layer for provider detail pages and admin launch panels

### Task B3.2: Add handler-readiness pages under settings admin

**Files:**
- Modify: `web/src/pages/settings/settings-nav.ts`
- Create: `web/src/pages/settings/HandlerReadinessPanel.tsx`
- Create: `web/src/pages/settings/HandlerGenerationRunsPanel.tsx`
- Create: `web/src/pages/settings/handler-readiness.api.ts`

**Views needed:**
- readiness by plugin family
- readiness by task class
- blocked reasons
- generation run history
- links to implemented `pipeline-worker` families

### Task B3.3: Add an execution launch surface for mapped plugins

**Files:**
- Create: `web/src/pages/marketplace/PluginExecutionPanel.tsx`
- Modify: `web/src/pages/marketplace/IntegrationProviderDetail.tsx`
- Reuse: `web/src/hooks/useAssistantChat.ts` only if execution guidance is added, not for core execution

**Capabilities:**
- select a mapped plugin
- render the schema form
- launch through `execute-task`
- show returned run id, state, logs, and structured result

**Acceptance criteria for Worker B3:**
- A user can inspect handler readiness in the app.
- A mapped plugin can be executed from a real UI.
- The handler generation program has a visible operator surface.

---

## Shared Frontend Constraints

All Branch B workers must obey these rules:

1. Reuse the existing shell in `web/src/components/layout/AppLayout.tsx`.
2. Keep new routes under current app concepts unless the contract lock explicitly changes them.
3. No Mantine imports. No `--mantine-*`. No `light-dark()`.
4. Use tokens from `web/src/tailwind.css`.
5. Prefer Ark UI or existing local UI primitives before inventing new patterns.
6. Do not introduce a second admin layout or a second marketplace layout.

---

## Testing And Verification Matrix

### Backend verification

- Run migration dry-run review before apply.
- Verify generated columns and indexes exist for all runtime tables.
- Verify RLS on every new table and view.
- Exercise `resolve_task_endpoint()` and `execute-task` with at least:
  - one mapped plugin
  - one unmapped plugin
  - one failed execution

### Frontend verification

- `npm run test` in `web/`
- `npm run build` in `web/`
- manual route checks:
  - `/app/flows`
  - `/app/flows/:flowId/overview`
  - `/app/marketplace/integrations`
  - `/app/marketplace/integrations/:providerSlug`
  - `/app/settings/admin/services`
  - `/app/settings/admin/integrations`
  - `/app/settings/admin/handlers`

### End-to-end verification

1. Import or sync normalized plugin specs.
2. Map one plugin to an executable function.
3. Open provider detail.
4. Launch a run through the schema form.
5. Confirm runtime rows appear in:
   - `flow_executions`
   - `flow_execution_logs`
   - `service_runs`
6. Confirm flow detail tabs render the new data.

---

## Risks To Manage Explicitly

1. **Naming drift risk:** resolve all table and view naming mismatches before workers start.
2. **Scope drift risk:** do not pull in scheduler queues or dashboards.
3. **Frontend contract drift:** do not let integrations, services, and handlers become three separate admin systems.
4. **Handler-generation drift:** do not generate from raw Java classes before the normalized spec layer exists.
5. **Parallel conflict risk:** workers must stay inside owned files unless a handoff checkpoint approves a change.

---

## Definition Of Done

This plan is complete when all of the following are true:

1. The backend has canonical flow runtime tables, views, helper functions, and RLS.
2. The app shell exposes real flow runtime pages, live integrations pages, and admin mapping pages.
3. The execution bridge can launch mapped plugins and persist runtime results.
4. The repo has a normalized plugin-spec and handler-readiness layer that makes Python handler generation tractable.
5. The frontend and backend now point at the same contracts instead of parallel placeholders.

---

## Suggested Execution Order

1. Phase 0 contract lock
2. Worker A1
3. Workers A2 and A3 in parallel
4. Worker B1 after A1
5. Worker B2 after A1 and initial A3 outputs
6. Worker B3 after A3 and A2
7. Integration hardening pass

Plan complete and saved to `docs/plans/2026-03-06-kestra-runtime-and-frontend-two-branch-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch a fresh subagent per worker lane, review between lanes, and keep the merge order tight.

**2. Parallel Session (separate)** - Open new sessions per branch and execute with `executing-plans` in isolated worktrees.

Which approach?
