---
doc_type: kestra_contract_capture
page_key: flows_list
title: Flows List
status: seeded

route_path: "/:tenant?/flows"
route_name: "flows/list"
page_component: "web-kt/src/components/flows/Flows.vue"
store_file: "web-kt/src/stores/flow.ts"
store_method: "findFlows"
generated_client_file: ""
generated_client_method: ""

upstream_method: "GET"
upstream_path: "/api/v1/{tenant}/flows/search"
openapi_ref: "#/paths/~1api~1v1~1{tenant}~1flows~1search/get"

backend_db_types_file: "kt-ct/generated/database.types.kt.ts"
backend_api_types_file: "kt-ct/generated/kestra-api/types.gen.ts"

candidate_tables:
  - "kt.flows"
  - "kt.executions"
candidate_backend_files: []

observed_query_params:
  - "page"
  - "size"
  - "sort"
observed_response_keys:
  - "results"
  - "total"

assumptions:
  - "Additional filter query params may be added by loadQuery and still need tracing."
open_questions:
  - "Does the first compatibility slice include latest execution enrichment from executionsStore.loadLatestExecutions?"
  - "Should the first slice match only the list payload or also the latest execution data shown on the page?"
updated_at: "2026-03-09"
---

## Notes

Seeded from the current `web-kt` route, page, store, and `openapi.yml`.
The current page uses `axios` directly through `findFlows`; it is not yet wired to the generated client.

## Mapping Candidates

| UI field | Candidate response field | Candidate source column/json path | Notes |
|---|---|---|---|
| flow id | `results[].id` | `kt.flows.id` | Core list identity |
| namespace | `results[].namespace` | `kt.flows.namespace` | Namespace is page-visible |
| deleted | `results[].deleted` | `kt.flows.deleted` | Used for row state and actions |
| revision | `results[].revision` | `kt.flows.revision` | Likely visible in list details or actions |
| total count | `total` | response wrapper | Returned by `findFlows` |

