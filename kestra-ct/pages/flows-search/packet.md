---
doc_type: kestra_page_packet
page_key: "flows_search"
title: "Flows search"
status: ready_for_capture
priority: 6
owner: ""
contract_mode: exact_kestra_compatibility
source_route_name: "flows/search"
source_route_path: "/:tenant?/flows/search"
source_component: "/home/jon/blockdata/web-kt/src/components/flows/FlowsSearch.vue"
source_store_file: "/home/jon/blockdata/web-kt/src/stores/flow.ts"
source_store_method: "searchFlows"
upstream_method: "GET"
upstream_path: "/api/v1/main/flows/source"
candidate_tables:
  - "kt.flows"
files_in_scope:
  - "/home/jon/blockdata/web-kt/src/routes/routes.js"
  - "/home/jon/blockdata/web-kt/src/components/flows/FlowsSearch.vue"
  - "/home/jon/blockdata/web-kt/src/stores/flow.ts"
  - "/home/jon/blockdata/web-kt/src/composables/useDataTableActions.ts"
  - "/home/jon/blockdata/web-kt/src/components/namespaces/components/NamespaceSelect.vue"
  - "/home/jon/blockdata/web-kt/src/composables/useBaseNamespaces.ts"
  - "/home/jon/blockdata/kestra-ct/generated/database.types.ts"
  - "/home/jon/blockdata/kestra-ct/generated/kestra-contract/types.gen.ts"
  - "/home/jon/blockdata/kestra-ct/onboarding/adapter-layout.md"
files_out_of_scope:
  - "/home/jon/blockdata/web-kt/src/components/flows/Flows.vue"
  - "/home/jon/blockdata/web-kt/src/components/flows/FlowRoot.vue"
  - "/home/jon/blockdata/web-kt/src/components/flows/FlowCreate.vue"
depends_on:
  - "HTTP compatibility proxy preserves GET /api/v1/main/flows/source"
  - "web-kt bootstrap endpoints remain available: /api/v1/configs and /api/v1/basicAuthValidationErrors"
  - "CT-generated DB and contract types are available for promotion after the preparation gate"
blockers:
  - "POST /api/v1/main/namespaces/autocomplete is a secondary dependency for the namespace filter dropdown"
  - "Plugin endpoints under /api/v1/plugins/... remain a runtime dependency for the broader UI shell"
updated_at: 2026-03-09
---

## Purpose

Make the Kestra flows source-code search page work as a compatibility slice. The page lets users search flow YAML source code by keyword, with optional namespace filtering and pagination. The first slice is read-only: render search results with highlighted fragments. No write operations.

## Trace Targets

- Route: `flows/search` at `/:tenant?/flows/search`
- Component: `web-kt/src/components/flows/FlowsSearch.vue`
- Store: `useFlowStore().searchFlows()`
- Upstream endpoint: `GET /api/v1/main/flows/source`
- Candidate tables: `kt.flows` (primary — `source_code` column backs the full-text search)

## Success Criteria

- [ ] Page loads through the preserved Kestra route shape
- [ ] `GET /api/v1/main/flows/source` returns a Kestra-compatible search payload
- [ ] Search result cards render in `FlowsSearch.vue` with namespace.id headers
- [ ] Fragment highlighting with `[mark]`/`[/mark]` renders correctly
- [ ] Namespace filter narrows results
- [ ] Pagination works

## Stop Conditions

- Missing contract detail for `flows/source`
- Missing bootstrap dependency in the shared UI shell
- Request shape differs from the preserved packet contract
- The namespace autocomplete endpoint is required but not yet implemented

## Notes

- This page only triggers search when a `q` query parameter is present. If `q` is empty or missing, the store sets `total = 0` and `search = undefined`, showing NoData.
- The namespace filter dropdown calls `POST /api/v1/main/namespaces/autocomplete` — this is a user-activated secondary endpoint, not on-load.
- Each result card links to `flows/update` using `item.model.namespace` and `item.model.id`. The link target is out of scope for this page.
- Fragment strings arrive with `[mark]`/`[/mark]` delimiters from the backend; the component escapes HTML then replaces these with `<mark>` tags.
