---
doc_type: kestra_page_packet
page_key: "executions_list"
title: "Executions list"
status: ready_for_capture
priority: 3
owner: ""
contract_mode: exact_kestra_compatibility
source_route_name: "executions/list"
source_route_path: "/:tenant?/executions"
source_component: "/home/jon/blockdata/web-kt/src/components/executions/Executions.vue"
source_store_file: "/home/jon/blockdata/web-kt/src/stores/executions.ts"
source_store_method: "findExecutions"
upstream_method: "GET"
upstream_path: "/api/v1/main/executions/search"
candidate_tables:
  - "kt.executions"
files_in_scope:
  - "/home/jon/blockdata/web-kt/src/routes/routes.js"
  - "/home/jon/blockdata/web-kt/src/components/executions/Executions.vue"
  - "/home/jon/blockdata/web-kt/src/stores/executions.ts"
  - "/home/jon/blockdata/web-kt/src/components/filter/configurations/executionFilter.ts"
  - "/home/jon/blockdata/openapi.yml"
  - "/home/jon/blockdata/kestra-ct/generated/database.types.ts"
  - "/home/jon/blockdata/kestra-ct/generated/kestra-contract/types.gen.ts"
  - "/home/jon/blockdata/kestra-ct/onboarding/adapter-layout.md"
files_out_of_scope:
  - "/home/jon/blockdata/web-kt/src/components/executions/ExecutionRoot.vue"
  - "/home/jon/blockdata/web-kt/src/components/flows/Flows.vue"
  - "/home/jon/blockdata/web-kt/src/components/flows/TriggerFlow.vue"
depends_on:
  - "HTTP compatibility proxy preserves GET /api/v1/main/executions/search"
  - "web-kt bootstrap endpoints remain available: /api/v1/configs and /api/v1/basicAuthValidationErrors"
  - "CT-generated DB and contract types are available for promotion after the preparation gate"
blockers:
  - "Bulk action endpoints (restart, replay, kill, pause, resume, delete, change-status, set-labels, unqueue, force-run) are user-activated write operations outside the first read-only slice"
  - "CSV export endpoint GET /api/v1/main/executions/export/by-query/csv is a follow-on dependency"
  - "Dashboard time-series chart in Sections component may require a separate chart data endpoint not traced in the primary store"
updated_at: 2026-03-09
---

## Purpose

Make the copied Kestra executions list page work as a read-only compatibility slice. The page must load, display paginated execution results from `GET /api/v1/main/executions/search`, support filtering by namespace, flowId, state, labels, kind, scope, childFilter, timeRange, and triggerExecutionId, support sorting by sortable columns, and render all default table columns.

## Trace Targets

- Route: `executions/list` at `/:tenant?/executions`
- Component: `web-kt/src/components/executions/Executions.vue`
- Store: `useExecutionsStore().findExecutions()`
- Upstream endpoint: `GET /api/v1/main/executions/search`
- Candidate tables: `kt.executions` primary

## Success Criteria

- [ ] `/ui/main/executions` loads without boot-time redirect failure
- [ ] `GET /api/v1/main/executions/search` returns a Kestra-compatible `PagedResults_Execution_` payload
- [ ] List rows render in `Executions.vue` with id, startDate, endDate, duration, namespace, flowId, labels, state columns
- [ ] Pagination works (page, size params)
- [ ] Sort works on sortable columns (id, state.startDate, state.endDate, state.duration, namespace, flowId, state.current)
- [ ] Filter by state renders correctly

## Stop Conditions

- Missing contract detail for `executions/search`
- Missing bootstrap dependency in the shared UI shell
- Request shape differs from the preserved packet contract
- Bulk action endpoints are required before the list can render (they should not be)

## Notes

- Golden path scope is read-only executions list behavior first.
- All bulk actions (restart, replay, kill, pause, resume, delete, change-status, set-labels, unqueue, force-run, CSV export) stay out of scope for the first slice.
- The `TriggerFlow` component in the top nav bar is user-activated and out of scope.
- The dashboard time-series chart (`Sections` component) is conditionally shown and does not call the executions store on load; it uses a local YAML chart definition. If it requires a separate chart data endpoint, that is a follow-on dependency.
- This page is also embedded inside `flows/update` as a tab, but the standalone `executions/list` route is the scope of this packet.
