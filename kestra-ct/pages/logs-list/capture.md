---
doc_type: kestra_page_capture
page_key: "logs_list"
title: "Logs list"
status: complete
route_traced: true
component_traced: true
store_traced: true
endpoint_traced: true
candidate_tables:
  - "kt.logs"
assumptions:
  - "The first slice will implement GET /api/v1/main/logs/search as the only on-load endpoint."
  - "The dashboard chart (Sections component) conditionally calls POST /api/v1/main/dashboards/charts/preview on mount when the chart toggle is enabled. This is a follow-on dependency, not part of the primary list slice."
open_questions:
  - "Whether the missing compatibility gateway on localhost:8080 blocks end-to-end page completion after the endpoint itself is implemented."
updated_at: 2026-03-10
---

## Observed Facts

- `web-kt/src/routes/routes.js:84-88` maps route name `logs/list` to path `/:tenant?/logs` and imports `LogsWrapper.vue`.
- `web-kt/src/components/logs/LogsWrapper.vue:78` imports `useLogsStore` from `../../stores/logs`.
- `web-kt/src/components/logs/LogsWrapper.vue:103` creates `logsStore` via `useLogsStore()`.
- `web-kt/src/components/logs/LogsWrapper.vue:219-232` defines `loadData()` which calls `logsStore.findLogs()` with `page`, `size`, `minLevel`, and `sort` parameters.
- `web-kt/src/components/logs/LogsWrapper.vue:242` uses `useDataTableActions` composable which wires `loadData` to route-change-driven data loading and provides `ready`, `onPageChanged`, `queryWithFilter`, and `load` helpers.
- `web-kt/src/components/logs/LogsWrapper.vue:194-217` defines `loadQuery()` which merges base params with filters from route.query, adds `startDate`, `endDate`, and contextual `filters[namespace][EQUALS]` and `filters[flowId][EQUALS]` when in flow/namespace edit context.
- `web-kt/src/stores/logs.ts:32-35` defines `findLogs()` issuing `GET ${apiUrl()}/logs/search` with params, then stores `response.data.results` in `logs` ref and `response.data.total` in `total` ref.
- `apiUrl()` resolves to `${baseUrl}/api/v1/main`, so the preserved frontend contract is `GET /api/v1/main/logs/search`.
- `web-kt/src/components/logs/LogsWrapper.vue:3` renders content only when `ready` is true (set after first data load).
- `web-kt/src/components/logs/LogsWrapper.vue:25-34` iterates `logsStore.logs` array, rendering each entry via `LogLine` component.
- `web-kt/src/components/logs/LogLine.vue` renders each log entry with level badge, timestamp, message text, and router-links for `executionId`, `namespace`, and `flowId`.
- `web-kt/src/components/logs/LogsWrapper.vue:7` renders `KSFilter` component with `useLogFilter()` configuration.
- `web-kt/src/components/filter/configurations/logFilter.ts` defines filter keys: `namespace` (IN, NOT_IN, CONTAINS, PREFIX), `level` (not a QueryFilter — uses `minLevel` param), `timeRange` (EQUALS), `scope` (EQUALS), `triggerId` (EQUALS, NOT_EQUALS, CONTAINS, STARTS_WITH, ENDS_WITH), `flowId` (EQUALS, NOT_EQUALS, CONTAINS, STARTS_WITH, ENDS_WITH).
- `web-kt/src/components/logs/LogsWrapper.vue:124-149` manages log level filter via `useRouteFilterPolicy`, reading from route query or localStorage default.
- `web-kt/src/components/logs/LogsWrapper.vue:19-23` conditionally renders `Sections` dashboard chart component when `showStatChart()` returns true and logs exist.
- `web-kt/src/components/logs/LogsWrapper.vue:264-266` watches `props.reloadLogs` to trigger refresh.
- `web-kt/src/stores/logs.ts:38-41` defines `deleteLogs()` issuing `DELETE ${apiUrl()}/logs/${namespace}/${flowId}` — user-activated, not called on load.
- No secondary on-load endpoints were identified. All other store methods are user-activated.

## Request Shape

- Method: `GET`
- Path: `/api/v1/main/logs/search`
- Path params: none (tenant is provided by the compatibility boundary)
- Query params:
  - `page` (integer, default 1)
  - `size` (integer, default 25 in component, 10 in OpenAPI)
  - `sort` (string, default `timestamp:desc`)
  - `minLevel` (Level enum: ERROR, WARN, INFO, DEBUG, TRACE — custom param, not in QueryFilter format)
  - `startDate` (date-time string, deprecated in OpenAPI but actively used)
  - `endDate` (date-time string, deprecated in OpenAPI but actively used)
  - `filters` (QueryFilter array — the new filter format used by KSFilter)
  - Deprecated compatibility params still in OpenAPI contract: `q`, `namespace`, `flowId`, `triggerId`
- Body: none

## Response Shape

- Schema: `PagedResults_LogEntry_` (OpenAPI lines 10005-10017)
- Top-level: `{ results: LogEntry[], total: number }`
- List field: `results`
- `LogEntry` key fields (from OpenAPI lines 9686-9724):
  - `namespace` (string, required)
  - `flowId` (string, required)
  - `taskId` (string, nullable)
  - `executionId` (string, nullable)
  - `taskRunId` (string, nullable)
  - `attemptNumber` (integer, int32, nullable)
  - `triggerId` (string, nullable)
  - `timestamp` (string, date-time)
  - `level` (Level enum: ERROR, WARN, INFO, DEBUG, TRACE)
  - `thread` (string)
  - `message` (string)
  - `executionKind` (ExecutionKind, nullable)

## Mapping Notes

| UI field | Response field | Source column or JSON path | Notes |
| --- | --- | --- | --- |
| Log level indicator | `results[].level` | `kt.logs.level` | Color-coded level badge in LogLine. Promoted column with `KtLogLevel` type. |
| Timestamp | `results[].timestamp` | `kt.logs.timestamp` | Formatted date display. Promoted column. |
| Message text | `results[].message` | `kt.logs.value.message` | No promoted `message` column; must extract from `value` JSON. |
| Execution link | `results[].executionId` | `kt.logs.execution_id` | Router-link to `executions/update`. Promoted column, nullable. |
| Namespace link | `results[].namespace` | `kt.logs.namespace` | Router-link to `flows/list` filtered by namespace. Promoted column. |
| Flow id link | `results[].flowId` | `kt.logs.flow_id` | Router-link to `flows/update`. Promoted column. |
| Task id | `results[].taskId` | `kt.logs.task_id` | Displayed when present. Promoted column, nullable. |
| Task run id | `results[].taskRunId` | `kt.logs.taskrun_id` | Displayed when present. Promoted column, nullable. |
| Attempt number | `results[].attemptNumber` | `kt.logs.attempt_number` | Displayed when present. Promoted column, nullable. |
| Trigger id | `results[].triggerId` | `kt.logs.trigger_id` | Displayed when present. Promoted column, nullable. |
| Thread | `results[].thread` | `kt.logs.value.thread` | No promoted column; must extract from `value` JSON. |
| Execution kind | `results[].executionKind` | `kt.logs.execution_kind` | Promoted column, nullable. |

## Risks

- The frontend dev server proxies `/api` to `http://localhost:8080`, and `page-registry.yaml` still marks the compatibility gateway as missing.
- `message` and `thread` fields have no promoted columns in `kt.logs`; the mapper must extract them from the `value` JSON column.
- `minLevel` is a non-standard filter parameter (not part of the `filters` QueryFilter array) — the filter module must handle it specially as a level-threshold filter (e.g., `minLevel=INFO` means return INFO, WARN, ERROR).
- `startDate` and `endDate` are deprecated params in the OpenAPI spec but still actively used by the component via `useRouteFilterPolicy`. The filter module must support them.
- The `Sections` dashboard chart component conditionally calls `POST /api/v1/main/dashboards/charts/preview` on mount when the chart toggle is enabled. This is outside the primary list slice scope.
