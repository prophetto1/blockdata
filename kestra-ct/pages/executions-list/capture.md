---
doc_type: kestra_page_capture
page_key: "executions_list"
title: "Executions list"
status: complete
route_traced: true
component_traced: true
store_traced: true
endpoint_traced: true
candidate_tables:
  - "kt.executions"
assumptions:
  - "The first implementation slice targets the read-only paginated list; all bulk write actions are follow-on."
  - "The dashboard time-series chart component uses local YAML chart definitions but DOES call a separate backend endpoint (POST /api/v1/main/dashboards/charts/preview) on mount when the chart is shown. This is a follow-on dependency, not part of the primary list slice."
open_questions:
  - "Whether the missing compatibility gateway on localhost:8080 blocks end-to-end page completion after the endpoint itself is implemented."
updated_at: 2026-03-09
---

## Observed Facts

- `web-kt/src/routes/routes.js:58-61` maps route name `executions/list` to path `/:tenant?/executions` and imports `Executions.vue`.
- `web-kt/src/components/executions/Executions.vue:461` imports `useExecutionsStore` from `../../stores/executions`.
- `web-kt/src/components/executions/Executions.vue:510` creates `executionsStore` via `useExecutionsStore()`.
- `web-kt/src/components/executions/Executions.vue:630-643` defines `loadData()` which calls `executionsStore.findExecutions()` with `size`, `page`, `sort`, and `state` parameters.
- `web-kt/src/components/executions/Executions.vue:651-664` uses `useDataTableActions` composable which wires `loadData` to route-change-driven data loading and provides `ready`, `onSort`, `onPageChanged`, `queryWithFilter`, and `load` helpers.
- `web-kt/src/components/executions/Executions.vue:767-784` defines `loadQuery()` which merges base params with `queryWithFilter()`, adds `filters[namespace][PREFIX]` from props.namespace, `filters[flowId][EQUALS]` from props.flowId, and `filters[state][IN]` from props.statuses when no state filter is already present.
- `web-kt/src/stores/executions.ts:279-292` defines `findExecutions()` issuing `GET ${apiUrl()}/executions/search` with params, then stores `response.data.results` in `executions` ref and `response.data.total` in `total` ref.
- `apiUrl()` resolves to `${baseUrl}/api/v1/main`, so the preserved frontend contract is `GET /api/v1/main/executions/search`.
- `web-kt/src/components/executions/Executions.vue:41` binds `executionsStore.total` to DataTable's `:total` prop for pagination.
- `web-kt/src/components/executions/Executions.vue:70` binds `executionsStore.executions` to SelectTable's `:data` prop for row rendering.
- `web-kt/src/components/executions/Executions.vue:71` sets default sort to `{prop: 'state.startDate', order: 'descending'}`.
- `web-kt/src/components/executions/Executions.vue:159-180` renders the `id` column as a RouterLink to `executions/update` with `namespace`, `flowId`, and `id` params.
- `web-kt/src/components/executions/Executions.vue:182-276` renders optional columns via `visibleColumns` computed property, including: `state.startDate`, `state.endDate`, `state.duration`, `namespace`, `flowId`, `labels`, `state.current`, `flowRevision`, `inputs`, `outputs`, `taskRunList.taskId`, `trigger`, `trigger.variables.executionId`.
- `web-kt/src/components/executions/Executions.vue:524-603` defines 13 optional columns with their default visibility: startDate (default), endDate (default), duration (default), namespace (default), flowId (default), labels (default), state.current (default), flowRevision (off), inputs (off), outputs (off), taskRunList.taskId (off), trigger (default), trigger.variables.executionId (off).
- `web-kt/src/components/executions/Executions.vue:622-624` defines non-sortable columns: `labels`, `flowRevision`, `inputs`, `outputs`, `taskRunList.taskId`, `trigger`, `trigger.variables.executionId`.
- `web-kt/src/components/executions/Executions.vue:63-65` conditionally renders a `Sections` dashboard chart component when `showStatChart()` returns true, using a local YAML chart definition imported at line 464.
- `web-kt/src/components/executions/Executions.vue:469` imports `useExecutionFilter` from filter configurations.
- `web-kt/src/components/filter/configurations/executionFilter.ts:19-146` defines filter keys: `namespace` (IN, NOT_IN, CONTAINS, PREFIX), `flowId` (EQUALS, NOT_EQUALS, CONTAINS, STARTS_WITH, ENDS_WITH), `kind` (EQUALS), `state` (IN, NOT_IN), `scope` (EQUALS, NOT_EQUALS), `childFilter` (EQUALS), `timeRange` (EQUALS), `labels` (EQUALS, NOT_EQUALS as key-value), `triggerExecutionId` (EQUALS, NOT_EQUALS, CONTAINS, STARTS_WITH, ENDS_WITH).
- `web-kt/src/components/executions/Executions.vue:5-16` conditionally shows top nav buttons for the `executions/list` route: CSV export button and TriggerFlow component (both user-activated).
- `web-kt/src/stores/executions.ts:26-64` defines the `Execution` TypeScript interface with fields: `id`, `namespace`, `flowId`, `tenantId?`, `taskRunList[]`, `state` (with `current`, `history`, `startDate`, `duration`, `endDate?`, `histories?`), `trigger?`, `metadata`, `inputs?`, `labels?`, `variables?`, `outputs?`, `originalId?`, `flowRevision?`, `scheduleDate?`.
- No on-load secondary endpoints were identified in the executions store. All other store methods (restart, replay, kill, pause, resume, delete, change-status, set-labels, unqueue, force-run, CSV export) are user-activated bulk actions or single-execution operations.
- `web-kt/src/components/dashboard/sections/Sections.vue:84` imports `useDashboardStore`. When `showDefault` is true (as set in Executions.vue line 64), the `useChartGenerator` composable (`web-kt/src/components/dashboard/composables/useDashboards.ts:31-68`) calls `dashboardStore.chartPreview()` on mount, which issues `POST /api/v1/main/dashboards/charts/preview`. This is a conditionally-loaded secondary endpoint — only fires when the chart toggle is enabled.

## Request Shape

- Method: `GET`
- Path: `/api/v1/main/executions/search`
- Path params: none (tenant is provided by the compatibility boundary)
- Query params:
  - `page` (integer, default 1)
  - `size` (integer, default 25 in component, 10 in OpenAPI)
  - `sort` (string array, default `state.startDate:desc`)
  - `filters` (QueryFilter array — the new filter format used by KSFilter)
  - Deprecated compatibility params still in OpenAPI contract: `q`, `scope`, `namespace`, `flowId`, `startDate`, `endDate`, `timeRange`, `state`, `labels`, `triggerExecutionId`, `childFilter`
- Body: none

## Response Shape

- Schema: `PagedResults_Execution_`
- Top-level: `{ results: Execution[], total: number }`
- List field: `results`
- `Execution` key fields (from OpenAPI):
  - `id` (string, required)
  - `namespace` (string, required)
  - `flowId` (string, required)
  - `flowRevision` (integer, required)
  - `state` (State object, required) with: `current` (State.Type), `startDate` (date-time), `endDate` (date-time, nullable), `duration` (string, nullable), `histories` (State.History[])
  - `labels` (Label[] — each with `key` and `value`)
  - `taskRunList` (TaskRun[])
  - `inputs` (object)
  - `outputs` (object)
  - `variables` (object)
  - `trigger` (ExecutionTrigger — `id`, `type`, `variables` object)
  - `metadata` (ExecutionMetadata)
  - `deleted` (boolean, required)
  - `parentId` (string)
  - `originalId` (string)
  - `scheduleDate` (date-time, nullable)
  - `kind` (ExecutionKind, nullable)

## Secondary Endpoints

### Dashboard chart preview (conditionally loaded)

- Method: `POST`
- Path: `/api/v1/main/dashboards/charts/preview`
- Triggered by: `Sections` component → `useChartGenerator` → `onMounted` → `dashboardStore.chartPreview()`
- Condition: Only fires when `showStatChart()` returns true (chart toggle is enabled and page is not embedded)
- Body: `{ chart: string (YAML), globalFilter: { filters: FilterObject[] } }`
- Response: Chart data object with `results` array and `total` count
- Scope note: This is a follow-on dependency, not required for the first read-only list slice

## Mapping Notes

| UI field | Response field | Source column or JSON path | Notes |
| --- | --- | --- | --- |
| Execution id link | `results[].id` | `kt.executions.id` | Links to `executions/update` with namespace, flowId, id params. |
| Start date column | `results[].state.startDate` | `kt.executions.start_date` | Rendered via `DateAgo` component. Default sort column (descending). |
| End date column | `results[].state.endDate` | `kt.executions.end_date` | Rendered via `DateAgo` component. Nullable. |
| Duration column | `results[].state.duration` | `kt.executions.state_duration` | Rendered via `Duration` component. Also uses `state.startDate` for running executions. |
| Namespace column | `results[].namespace` | `kt.executions.namespace` | Rendered with `invisibleSpace()` formatting. |
| Flow id column | `results[].flowId` | `kt.executions.flow_id` | Links to `flows/update` with namespace and flowId params. |
| Labels column | `results[].labels` | `kt.executions.value.labels` | Rendered via `Labels.vue`. Filtered by `miscStore.configs.hiddenLabelsPrefixes`. No promoted `labels` column in `kt.executions`; stored in `value` JSON. |
| State column | `results[].state.current` | `kt.executions.state_current` | Rendered via `Status` component with size="small". |
| Flow revision column | `results[].flowRevision` | `kt.executions.value.flowRevision` | Optional column, off by default. No promoted column; stored in `value` JSON. |
| Inputs tooltip | `results[].inputs` | `kt.executions.value.inputs` | Optional column, off by default. Rendered as JSON in tooltip. No promoted column. |
| Outputs tooltip | `results[].outputs` | `kt.executions.value.outputs` | Optional column, off by default. Rendered as JSON in tooltip. No promoted column. |
| Task id column | `results[].taskRunList[last].taskId` | `kt.executions.value.taskRunList` | Optional column, off by default. Shows last taskRun's taskId and attempt count. No promoted column. |
| Trigger column | `results[].trigger` | `kt.executions.value.trigger` | Rendered via `TriggerAvatar`. No promoted column. |
| Parent execution column | `results[].trigger.variables.executionId` | `kt.executions.trigger_execution_id` | Optional column, off by default. Links to parent execution when trigger type is Subflow. Has promoted column `trigger_execution_id`. |

## Risks

- The frontend dev server proxies `/api` to `http://localhost:8080`, and `page-registry.yaml` still marks the compatibility gateway as missing.
- Many response fields (`labels`, `flowRevision`, `inputs`, `outputs`, `taskRunList`, `trigger`) are stored inside the `kt.executions.value` JSON column rather than as promoted top-level columns. The mapper must extract these from the JSON blob.
- The `state.duration` field in the Kestra API response is a string (ISO duration), while the DB column `state_duration` is a number. The mapper must convert between these representations.
- The `state.histories` array is not represented as a promoted column and must be extracted from the `value` JSON blob.
- Filter semantics (especially the new `filters` QueryFilter format with comparators like IN, NOT_IN, CONTAINS, PREFIX) will need to be translated into Supabase query predicates. The exact QueryFilter schema was not fully resolved from the OpenAPI spec during this trace.
- The `Sections` dashboard chart component is conditionally rendered and calls `POST /api/v1/main/dashboards/charts/preview` on mount when the chart toggle is enabled. This is a follow-on dependency outside the primary list slice scope.
