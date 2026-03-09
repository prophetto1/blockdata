---
doc_type: kestra_page_packet
page_key: "flows_create"
title: "Flows create"
status: ready_for_capture
priority: 8
owner: ""
contract_mode: exact_kestra_compatibility
source_route_name: "flows/create"
source_route_path: "/:tenant?/flows/new"
source_component: "/home/jon/blockdata/web-kt/src/components/flows/FlowCreate.vue"
source_store_file: "/home/jon/blockdata/web-kt/src/stores/flow.ts"
source_store_method: "createFlow"
upstream_method: "POST"
upstream_path: "/api/v1/main/flows"
candidate_tables:
  - "kt.flows"
  - "kt.namespace_file_metadata"
files_in_scope:
  - "/home/jon/blockdata/web-kt/src/routes/routes.js"
  - "/home/jon/blockdata/web-kt/src/components/flows/FlowCreate.vue"
  - "/home/jon/blockdata/web-kt/src/components/flows/MultiPanelFlowEditorView.vue"
  - "/home/jon/blockdata/web-kt/src/components/inputs/EditorButtonsWrapper.vue"
  - "/home/jon/blockdata/web-kt/src/components/plugins/PluginListWrapper.vue"
  - "/home/jon/blockdata/web-kt/src/components/plugins/PluginList.vue"
  - "/home/jon/blockdata/web-kt/src/components/no-code/NoCode.vue"
  - "/home/jon/blockdata/web-kt/src/override/components/flows/panelDefinition.ts"
  - "/home/jon/blockdata/web-kt/src/stores/flow.ts"
  - "/home/jon/blockdata/web-kt/src/stores/blueprints.ts"
  - "/home/jon/blockdata/web-kt/src/stores/plugins.ts"
  - "/home/jon/blockdata/web-kt/src/components/flows/useFilesPanels.ts"
  - "/home/jon/blockdata/web-kt/src/composables/useBaseNamespaces.ts"
  - "/home/jon/blockdata/openapi.yml"
  - "/home/jon/blockdata/kestra-ct/generated/database.types.ts"
  - "/home/jon/blockdata/kestra-ct/generated/kestra-contract/types.gen.ts"
  - "/home/jon/blockdata/kestra-ct/onboarding/adapter-layout.md"
files_out_of_scope:
  - "/home/jon/blockdata/web-kt/src/components/flows/Flows.vue"
  - "/home/jon/blockdata/web-kt/src/components/flows/FlowsSearch.vue"
  - "/home/jon/blockdata/web-kt/src/components/flows/FlowRoot.vue"
depends_on:
  - "HTTP compatibility proxy preserves POST /api/v1/main/flows plus POST /api/v1/main/flows/validate and POST /api/v1/main/flows/graph"
  - "Default documentation tab dependencies remain available at /api/v1/plugins/groups/subgroups and /api/v1/plugins/icons/groups"
  - "web-kt bootstrap endpoints remain available: /api/v1/configs and /api/v1/basicAuthValidationErrors"
  - "CT-generated DB and contract types are available for promotion after the preparation gate"
blockers:
  - "Query-param-dependent blueprint prefill paths use endpoints that do not cleanly match the checked-in OpenAPI contract"
  - "Namespace file save uses /api/v1/main/namespaces/{namespace}/files as a secondary save dependency outside the flows adapter"
  - "The duplicate-id fallback switches create mode from POST /flows to PUT /flows/{namespace}/{id}"
updated_at: 2026-03-09
---

## Purpose

Make the copied Kestra create-flow page usable without redesigning the editor. This page is inherently write-oriented, so the first slice is allowed to seed editor state, validate YAML, render a topology preview for the seeded flow, load the default plugin documentation assets, and persist a new flow through `POST /api/v1/main/flows`. Copy, blueprint, delete, overwrite, and namespace-file save paths are documented as secondary behaviors, not the primary slice.

## Trace Targets

- Route: `flows/create` at `/:tenant?/flows/new`
- Component: `web-kt/src/components/flows/FlowCreate.vue`
- Store: `useFlowStore().createFlow()` for the primary save path, with `useFlowStore().initYamlSource()` driving on-load validation and graph generation
- Upstream endpoint: `POST /api/v1/main/flows`
- On-load secondary endpoints:
  - `POST /api/v1/main/flows/validate`
  - `POST /api/v1/main/flows/graph`
  - `GET /api/v1/plugins/groups/subgroups`
  - `GET /api/v1/plugins/icons/groups`
- Candidate tables: `kt.flows` primary, `kt.namespace_file_metadata` secondary when namespace files are saved from the editor

## Success Criteria

- [ ] `/ui/main/flows/new` loads without boot-time redirect failure
- [ ] The editor seeds YAML for the default create path and shows an editable flow
- [ ] `POST /api/v1/main/flows/validate` returns a Kestra-compatible validation array and the validation state renders
- [ ] `POST /api/v1/main/flows/graph` returns a Kestra-compatible `FlowGraph` so topology can render for the seeded flow
- [ ] The default documentation tab loads plugin groups and plugin group icons
- [ ] Saving via `POST /api/v1/main/flows` returns a Kestra-compatible `FlowWithSource` payload and redirects to `flows/update`

## Stop Conditions

- Missing contract detail for `POST /flows`, `POST /flows/validate`, or `POST /flows/graph`
- Missing plugin-list or plugin-icon endpoints needed by the default documentation tab
- Missing auth/bootstrap dependency in the shared UI shell
- Request shape differs from the observed create-page contract
- Blueprint-prefill routes are required for the slice but cannot be reconciled to a documented backend contract

## Notes

- This page is the exception to the usual read-only first slice because it has no page-specific read endpoint.
- The default blank create path is primary scope. Copy, blueprint, guided onboarding, delete, and namespace-file save paths are secondary and documented in `capture.md`.
- If the create request returns a duplicate-id error, the UI can fall back to `PUT /api/v1/main/flows/{namespace}/{id}` after user confirmation. That overwrite path is not the primary target for this packet.
