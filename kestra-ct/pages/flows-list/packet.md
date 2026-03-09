---
doc_type: kestra_page_packet
page_key: "flows_list"
title: "Flows list"
status: ready_for_capture
priority: high
owner: ""
contract_mode: exact_kestra_compatibility
source_route_name: "flows/list"
source_route_path: "/:tenant?/flows"
source_component: "web-kt/src/components/flows/Flows.vue"
source_store_file: "web-kt/src/stores/flow.ts"
source_store_method: "findFlows"
upstream_method: "GET"
upstream_path: "/api/v1/main/flows/search"
candidate_tables:
  - "kt.flows"
  - "kt.executions"
files_in_scope:
  - "web-kt/src/routes/routes.js"
  - "web-kt/src/components/flows/Flows.vue"
  - "web-kt/src/stores/flow.ts"
  - "web-kt/src/stores/executions.ts"
  - "kestra-ct/generated/database.types.ts"
  - "kestra-ct/generated/kestra-contract/types.gen.ts"
  - "kestra-ct/onboarding/adapter-layout.md"
files_out_of_scope:
  - "web-kt/src/components/flows/FlowRoot.vue"
  - "web-kt/src/components/flows/FlowCreate.vue"
  - "web-kt/src/components/flows/FlowsSearch.vue"
depends_on:
  - "HTTP compatibility proxy preserves GET /api/v1/main/flows/search"
  - "web-kt bootstrap endpoints remain available: /api/v1/configs and /api/v1/basicAuthValidationErrors"
  - "CT-generated DB and contract types are available for promotion after the preparation gate"
blockers:
  - "POST /api/v1/main/executions/latest is a secondary dependency for last-execution columns on the page"
  - "Plugin endpoints under /api/v1/plugins/... remain a runtime dependency for the broader UI shell"
updated_at: 2026-03-09
---

## Purpose

Make the copied Kestra flows list page work as the first compatibility slice without redesigning the UI or broadening into the full flows domain.

## Trace Targets

- Route: `flows/list` at `/:tenant?/flows`
- Component: `web-kt/src/components/flows/Flows.vue`
- Store: `useFlowStore().findFlows()`
- Upstream endpoint: `GET /api/v1/main/flows/search`
- Candidate tables: `kt.flows` primary, `kt.executions` secondary for last-execution summaries

## Success Criteria

- [ ] Page loads through the preserved Kestra route shape
- [ ] `GET /api/v1/main/flows/search` returns a Kestra-compatible list payload
- [ ] List rows render in `Flows.vue`
- [ ] Search works
- [ ] Sort or pagination works

## Stop Conditions

- Missing contract detail for `flows/search`
- Missing bootstrap dependency in the shared UI shell
- Request shape differs from the preserved packet contract
- The page requires `executions/latest` behavior beyond the golden-path scope

## Notes

- Golden path scope is read-only flows list behavior first.
- Create, edit, delete, import, export, enable, disable, and execute actions stay out of scope for the first slice.
- `Flows.vue` also calls `POST /api/v1/main/executions/latest`; treat that as a follow-on dependency, not the primary endpoint for this packet.
