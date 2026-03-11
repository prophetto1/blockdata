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
source_component: "web-kt/src/components/logs/LogsWrapper.vue"
source_store_file: "web-kt/src/stores/logs.ts"
source_store_method: "findLogs"
upstream_method: "GET"
upstream_path: "/api/v1/main/logs/search"
candidate_tables:
  - "kt.logs"
files_in_scope:
  - "web-kt/src/routes/routes.js"
  - "web-kt/src/components/logs/LogsWrapper.vue"
  - "web-kt/src/components/logs/LogLine.vue"
  - "web-kt/src/stores/logs.ts"
  - "web-kt/src/components/filter/configurations/logFilter.ts"
  - "openapi.yml"
  - "kestra-ct/generated/database.types.ts"
  - "kestra-ct/generated/kestra-contract/types.gen.ts"
  - "kestra-ct/onboarding/adapter-layout.md"
files_out_of_scope: []
depends_on:
  - "HTTP compatibility proxy preserves GET /api/v1/main/logs/search"
  - "web-kt bootstrap endpoints remain available: /api/v1/configs and /api/v1/basicAuthValidationErrors"
  - "CT-generated DB and contract types are available for promotion after the preparation gate"
blockers:
  - "DELETE /api/v1/main/logs/{namespace}/{flowId} is user-activated, out of first slice scope"
  - "Plugin endpoints under /api/v1/plugins/... remain a runtime dependency for the broader UI shell"
  - "Dashboard chart (Sections component) conditionally calls POST /api/v1/main/dashboards/charts/preview — follow-on dependency"
updated_at: 2026-03-10
---

## Purpose

Make the copied Kestra logs list page work as a read-only compatibility slice. The page must load, display paginated log entries from `GET /api/v1/main/logs/search`, support filtering by namespace, flowId, level, timeRange, triggerId, and scope, and render log lines with level, timestamp, message, and navigation links.

## Trace Targets

- Route: `logs/list` at `/:tenant?/logs`
- Component: `web-kt/src/components/logs/LogsWrapper.vue`
- Store: `useLogsStore().findLogs()`
- Upstream endpoint: `GET /api/v1/main/logs/search`
- Candidate tables: `kt.logs`

## Success Criteria

- [ ] `/ui/main/logs` loads without boot-time redirect failure
- [ ] `GET /api/v1/main/logs/search` returns a Kestra-compatible `PagedResults_LogEntry_` payload
- [ ] Log lines render with level, timestamp, message
- [ ] Search/filter works (namespace, level, timeRange)
- [ ] Pagination works (page, size params)

## Stop Conditions

- Missing contract detail for `logs/search`
- Missing bootstrap dependency in the shared UI shell
- Request shape differs from the preserved packet contract
- The page requires dashboard chart preview endpoint before the log list can render (it should not)

## Notes

- First slice is read-only. Delete operations are out of scope.
- Dashboard chart (Sections component) is conditionally rendered when logs exist and chart toggle is enabled; this is a follow-on dependency, not primary scope.
- `minLevel` filter is a custom parameter not in the standard `filters` QueryFilter format — the filter module must handle it specially.
- `startDate` and `endDate` are deprecated params in the OpenAPI spec but still actively used by the component via `useRouteFilterPolicy`.
