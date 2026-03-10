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
  - "The `value` JSON column in `kt.logs` contains at minimum `thread`, `message`, and `index` fields that are not promoted to top-level columns."
  - "The `minLevel` query parameter acts as a threshold filter: INFO means return INFO, WARN, and ERROR entries."
open_questions:
  - "Whether the compatibility gateway on localhost:8080 blocks end-to-end page completion after the endpoint itself is implemented."
  - "Whether the timeseries chart section requires a separate endpoint or can be served by the same search results with aggregation."
  - "Exact JSON structure of the `value` column — whether `thread`, `message`, and `index` are always present or optional."
updated_at: 2026-03-09
---

## Observed Facts

- Route name is `logs/list`.
- Route path is `/:tenant?/logs`.
- The page component is `web-kt/src/components/logs/LogsWrapper.vue`.
- The primary store method is `useLogsStore().findLogs()` in `web-kt/src/stores/logs.ts`.
- `findLogs()` issues `GET ${apiUrl()}/logs/search` with options passed as query params.
- `apiUrl()` resolves to `${baseUrl}/api/v1/main`, so the preserved frontend contract is `GET /api/v1/main/logs/search`.
- Default pagination: `page=1`, `size=25`.
- Default sort: `timestamp:desc`.
- The component constructs a `loadQuery` that merges base pagination/sort with filter params from `KSFilter`.
- When embedded in `flows/update`, filters are pre-set with `filters[namespace][EQUALS]` and `filters[flowId][EQUALS]`. When embedded in `namespaces/update`, only `filters[namespace][EQUALS]` is pre-set.
- The standalone `/logs` route does not pre-set namespace or flowId filters.
- `LogsWrapper.vue` applies a `minLevel` threshold filter. The default is `INFO` (from localStorage `defaultLogLevel` or fallback). The level filter is normalized to `filters[level][EQUALS]` via `normalizeRouteLevelFilter`.
- `startDate` and `endDate` are always sent. Default `startDate` is 7 days ago. If `timeRange` is set, `startDate` is computed from `moment().subtract(duration)`.
- The component renders each log entry through `LogLine.vue`.
- `LogLine.vue` renders: level (colored tag badge), timestamp (ISO formatted), message (markdown-rendered with ANSI-to-HTML conversion and linkification).
- `LogLine.vue` renders meta badges for all `Log` fields except: `message`, `timestamp`, `thread`, `taskRunId`, `level`, `index`, `attemptNumber`, `executionKind`.
- Visible meta badges: `namespace` (links to `flows/list`), `flowId` (links to `flows/update`), `taskId`, `executionId` (links to `executions/update`), `triggerId`.
- Copy-to-clipboard format: `${log.level} ${log.timestamp} ${log.message}`.
- The store's `Log` interface defines: `level`, `namespace`, `flowId`, `executionId`, `triggerId`, `taskId`, `thread`, `taskRunId`, `index`, `attemptNumber`, `executionKind`, `timestamp`, `message`.
- `LogsWrapper.vue` also loads a timeseries chart from `logs_timeseries_chart.yaml` via the `Sections` dashboard component, but this is a visual overlay and not the primary data endpoint.
- The store also exposes `deleteLogs()` which issues `DELETE /api/v1/main/logs/{namespace}/{flowId}` — this is out of scope for the first slice.
- Filter configuration (`logFilter.ts`) defines these filter keys for the standalone route: `namespace` (multi-select, IN/NOT_IN/CONTAINS/PREFIX), `level` (select, EQUALS, default INFO, visible by default), `timeRange` (select, relative durations), `scope` (radio, EQUALS/NOT_EQUALS), `triggerId` (text, EQUALS/NOT_EQUALS/CONTAINS/STARTS_WITH/ENDS_WITH), `flowId` (text, same comparators as triggerId).

## Request Shape

- Method: `GET`
- Path: `/api/v1/main/logs/search`
- Query params:
  - `page` (integer, default 1)
  - `size` (integer, default 25)
  - `sort` (string, default `timestamp:desc`)
  - `filters[level][EQUALS]` (level threshold, default INFO)
  - `filters[namespace][IN]`, `filters[namespace][NOT_IN]`, `filters[namespace][CONTAINS]`, `filters[namespace][PREFIX]`
  - `filters[flowId][EQUALS]`, `filters[flowId][CONTAINS]`, etc.
  - `filters[triggerId][EQUALS]`, `filters[triggerId][CONTAINS]`, etc.
  - `filters[scope][EQUALS]`, `filters[scope][NOT_EQUALS]`
  - `startDate` (ISO datetime string, always sent)
  - `endDate` (ISO datetime string, always sent)
  - Deprecated compatibility params still in OpenAPI: `q`, `namespace`, `flowId`, `triggerId`, `minLevel`, `startDate`, `endDate`
- Body: none

## Response Shape

- Top-level fields:
  - `results`
  - `total`
- List field: `results` (array of `LogEntry`)
- LogEntry fields per OpenAPI `LogEntry` schema:
  - `namespace` (string, required)
  - `flowId` (string, required)
  - `taskId` (string, nullable)
  - `executionId` (string, nullable)
  - `taskRunId` (string, nullable)
  - `attemptNumber` (integer, nullable)
  - `triggerId` (string, nullable)
  - `timestamp` (datetime string)
  - `level` (Level enum: ERROR, WARN, INFO, DEBUG, TRACE)
  - `thread` (string)
  - `message` (string)
  - `executionKind` (ExecutionKind enum: NORMAL, TEST, PLAYGROUND, nullable)

## Mapping Notes

| UI field | Response field | Source column or JSON path | Notes |
| --- | --- | --- | --- |
| Level badge | `results[].level` | `kt.logs.level` | Top-level column. Enum: ERROR, WARN, INFO, DEBUG, TRACE. |
| Timestamp | `results[].timestamp` | `kt.logs.timestamp` | Top-level column. Rendered with `Filters.date(log.timestamp, "iso")`. |
| Namespace badge | `results[].namespace` | `kt.logs.namespace` | Top-level column. Badge links to `flows/list?namespace=...`. |
| Flow ID badge | `results[].flowId` | `kt.logs.flow_id` | Top-level column. Badge links to `flows/update/{namespace}/{id}`. |
| Execution ID badge | `results[].executionId` | `kt.logs.execution_id` | Top-level column, nullable. Badge links to `executions/update`. |
| Task ID badge | `results[].taskId` | `kt.logs.task_id` | Top-level column, nullable. |
| Trigger ID badge | `results[].triggerId` | `kt.logs.trigger_id` | Top-level column, nullable. |
| Message body | `results[].message` | `kt.logs.value->'message'` | JSON extraction from `value` column. Rendered as markdown with ANSI conversion. |
| Thread (hidden) | `results[].thread` | `kt.logs.value->'thread'` | JSON extraction from `value` column. Not displayed in UI but present in Log interface. |
| Task Run ID (hidden) | `results[].taskRunId` | `kt.logs.taskrun_id` | Top-level column, nullable. Not displayed as badge but used as LogLine key. |
| Attempt Number (hidden) | `results[].attemptNumber` | `kt.logs.attempt_number` | Top-level column, nullable. Not displayed in UI. |
| Execution Kind (hidden) | `results[].executionKind` | `kt.logs.execution_kind` | Top-level column, nullable. Not displayed in UI. |
| Index (hidden) | `results[].index` | `kt.logs.value->'index'` | JSON extraction from `value` column. Not displayed in UI. Part of Log interface. |

## Risks

- The frontend dev server proxies `/api` to `http://localhost:8080`, and `page-registry.yaml` still marks the compatibility gateway as missing.
- `thread`, `message`, and `index` are not top-level columns in `kt.logs`. They must be extracted from the `value` JSON column. The exact JSON structure should be confirmed against live data.
- The `minLevel` filter acts as a threshold (e.g., INFO means INFO + WARN + ERROR). The adapter must implement level ordering logic, not simple equality matching.
- The timeseries chart (`logs_timeseries_chart.yaml`) loads via the `Sections` dashboard component and may require a separate aggregation endpoint not yet identified.
- `startDate` and `endDate` are always sent by the frontend (default 7 days). The adapter must support date range filtering on `kt.logs.timestamp`.
- The `scope` filter key and `timeRange` filter key have UI-level semantics that may not map directly to OpenAPI query parameters. The adapter may need to interpret these or pass them through.
