---
doc_type: kestra_page_packet
page_key: "logs_list"
title: "Logs list"
status: ready_for_capture
priority: 4
owner: ""
contract_mode: exact_kestra_compatibility
source_route_name: "logs/list"
source_route_path: "/:tenant?/logs"
source_component: "/home/jon/blockdata/web-kt/src/components/logs/LogsWrapper.vue"
source_store_file: "/home/jon/blockdata/web-kt/src/stores/logs.ts"
source_store_method: "findLogs"
upstream_method: "GET"
upstream_path: "/api/v1/main/logs/search"
candidate_tables:
  - "kt.logs"
files_in_scope:
  - "/home/jon/blockdata/web-kt/src/routes/routes.js"
  - "/home/jon/blockdata/web-kt/src/components/logs/LogsWrapper.vue"
  - "/home/jon/blockdata/web-kt/src/components/logs/LogLine.vue"
  - "/home/jon/blockdata/web-kt/src/stores/logs.ts"
  - "/home/jon/blockdata/web-kt/src/components/filter/configurations/logFilter.ts"
  - "/home/jon/blockdata/kestra-ct/generated/database.types.ts"
  - "/home/jon/blockdata/kestra-ct/generated/kestra-contract/types.gen.ts"
  - "/home/jon/blockdata/kestra-ct/onboarding/adapter-layout.md"
files_out_of_scope:
  - "/home/jon/blockdata/web-kt/src/components/logs/TaskRunDetails.vue"
depends_on:
  - "HTTP compatibility proxy preserves GET /api/v1/main/logs/search"
  - "web-kt bootstrap endpoints remain available: /api/v1/configs and /api/v1/basicAuthValidationErrors"
  - "CT-generated DB and contract types are available for promotion after the preparation gate"
blockers:
  - "Timeseries chart endpoint (logs_timeseries_chart.yaml) is a secondary visual dependency not required for the primary log list"
  - "DELETE /api/v1/main/logs/{namespace}/{flowId} is a write operation outside first-slice scope"
updated_at: 2026-03-09
---

## Purpose

Make the copied Kestra logs list page work as a read-only compatibility slice without redesigning the UI or broadening into log deletion, export, or chart rendering.

## Trace Targets

- Route: `logs/list` at `/:tenant?/logs`
- Component: `web-kt/src/components/logs/LogsWrapper.vue`
- Store: `useLogsStore().findLogs()` in `web-kt/src/stores/logs.ts`
- Upstream endpoint: `GET /api/v1/main/logs/search`
- Candidate tables: `kt.logs`

## Success Criteria

- [ ] Page loads through the preserved Kestra route shape
- [ ] `GET /api/v1/main/logs/search` returns a Kestra-compatible `PagedResultsLogEntry` payload
- [ ] Log entries render in `LogLine.vue` with level, timestamp, message, and meta badges
- [ ] Level filtering works (minLevel threshold: INFO includes INFO, WARN, ERROR)
- [ ] Pagination works (page, size query params)
- [ ] Sort by timestamp works

## Stop Conditions

- Missing contract detail for `logs/search`
- Missing bootstrap dependency in the shared UI shell
- Request shape differs from the preserved packet contract
- The `value` JSON column structure for `thread`, `message`, and `index` fields cannot be confirmed

## Notes

- Golden path scope is read-only log list behavior first.
- Delete logs, timeseries chart rendering, and scope/timeRange filter semantics beyond basic date range stay out of scope for the first slice.
- `LogsWrapper.vue` is also embedded in `flows/update` and `namespaces/update` with pre-set filters; this packet covers only the standalone `/logs` route.
- The `LogLine` component renders meta badges for `namespace`, `flowId`, `taskId`, `executionId`, and `triggerId` with router links. Hidden fields: `thread`, `taskRunId`, `index`, `attemptNumber`, `executionKind`.
