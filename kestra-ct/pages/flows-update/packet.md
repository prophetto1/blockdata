---
doc_type: kestra_page_packet
page_key: "flows_update"
title: "Flows update"
status: ready_for_capture
priority: 5
owner: ""
contract_mode: exact_kestra_compatibility
source_route_name: "flows/update"
source_route_path: "/:tenant?/flows/edit/:namespace/:id/:tab?"
source_component: "/home/jon/blockdata/web-kt/src/components/flows/FlowRoot.vue"
source_store_file: "/home/jon/blockdata/web-kt/src/stores/flow.ts"
source_store_method: "loadFlow"
upstream_method: "GET"
upstream_path: "/api/v1/main/flows/{namespace}/{id}"
candidate_tables:
  - "kt.flows"
files_in_scope:
  - "/home/jon/blockdata/web-kt/src/routes/routes.js"
  - "/home/jon/blockdata/web-kt/src/components/flows/FlowRoot.vue"
  - "/home/jon/blockdata/web-kt/src/components/flows/FlowRootTopBar.vue"
  - "/home/jon/blockdata/web-kt/src/stores/flow.ts"
  - "/home/jon/blockdata/web-kt/src/mixins/routeContext.js"
  - "/home/jon/blockdata/kestra-ct/generated/database.types.ts"
  - "/home/jon/blockdata/kestra-ct/generated/kestra-contract/types.gen.ts"
  - "/home/jon/blockdata/kestra-ct/onboarding/adapter-layout.md"
files_out_of_scope:
  - "/home/jon/blockdata/web-kt/src/components/flows/Flows.vue"
  - "/home/jon/blockdata/web-kt/src/components/flows/FlowCreate.vue"
  - "/home/jon/blockdata/web-kt/src/components/flows/FlowsSearch.vue"
depends_on:
  - "HTTP compatibility proxy preserves GET /api/v1/main/flows/{namespace}/{id}"
  - "web-kt bootstrap endpoints remain available: /api/v1/configs and /api/v1/basicAuthValidationErrors"
  - "CT-generated DB and contract types are available for promotion after the preparation gate"
  - "flows_list page (golden path) is the prerequisite — this page is linked from the flows list"
blockers:
  - "POST /api/v1/main/flows/validate is required on load for flow validation display"
  - "GET /api/v1/main/flows/{namespace}/{id}/graph is required on load for topology tab"
  - "GET /api/v1/main/flows/{namespace}/{id}/dependencies is called 1s after flow loads for dependency count badge"
  - "Plugin endpoints under /api/v1/plugins/... remain a runtime dependency for the editor tab"
  - "Tab sub-pages (executions, triggers, logs, metrics, revisions, concurrency) each call additional endpoints documented in capture.md"
updated_at: 2026-03-09
---

## Purpose

Make the copied Kestra flow detail/edit page load and display a single flow's overview and topology as the first compatibility slice. This page is the target when a user clicks a flow from the flows list. The first slice is read-only: load the flow by namespace and id, render the page with tabs, and show the overview and topology views. Write operations (save, delete, enable/disable) and secondary tab endpoints (executions, triggers, logs, metrics, revisions, concurrency) are follow-on dependencies, not primary scope.

## Trace Targets

- Route: `flows/update` at `/:tenant?/flows/edit/:namespace/:id/:tab?`
- Component: `web-kt/src/components/flows/FlowRoot.vue`
- Store: `useFlowStore().loadFlow({namespace, id, allowDeleted: true})`
- Primary endpoint: `GET /api/v1/main/flows/{namespace}/{id}` with `?source=true&allowDeleted=true`
- On-load secondary endpoints:
  - `GET /api/v1/main/flows/{namespace}/{id}/graph` (topology visualization)
  - `GET /api/v1/main/flows/{namespace}/{id}/dependencies` (dependency count badge, called 1s after load)
  - `POST /api/v1/main/flows/validate` (validation status display)
- Candidate tables: `kt.flows` primary

## Success Criteria

- [ ] Page loads through the preserved Kestra route shape (`/ui/main/flows/edit/{namespace}/{id}`)
- [ ] `GET /api/v1/main/flows/{namespace}/{id}` returns a Kestra-compatible `FlowWithSource` payload
- [ ] FlowRootTopBar renders with flow id and namespace breadcrumb
- [ ] Tab bar renders with available tabs
- [ ] Default tab (overview or topology) displays without errors

## Stop Conditions

- Missing contract detail for `GET /flows/{namespace}/{id}`
- Missing bootstrap dependency in the shared UI shell
- Request shape differs from the preserved packet contract
- Page requires write operations that are outside golden-path read-only scope

## Notes

- First slice scope is read-only flow detail rendering only.
- Save, delete, import, export, enable, disable, and execute actions stay out of scope for the first slice.
- The page defaults to the "overview" tab (or last-used tab from localStorage). On first load without a tab param, FlowRoot.vue redirects to `overview`.
- FlowRoot.vue calls `loadFlow` on `created()` and also calls `loadGraph` and `loadDependencies` from watchers after the flow loads.
- `validateFlow` is called immediately after `loadFlow` succeeds, with `revision: {nextRevision}\n{source}` prepended.
- The tab surface is large (11 tabs), but each tab's secondary endpoints are documented in capture.md for future slices.
- The `flows/update` route is the detail destination when clicking a flow row in `flows/list`.
