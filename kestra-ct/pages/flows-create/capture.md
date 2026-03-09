---
doc_type: kestra_page_capture
page_key: "flows_create"
title: "Flows create"
status: complete
route_traced: true
component_traced: true
store_traced: true
endpoint_traced: true
candidate_tables:
  - "kt.flows"
  - "kt.namespace_file_metadata"
assumptions:
  - "The first implementation slice will target the default blank create path rather than blueprint-prefill variants."
  - "The default documentation tab is part of the effective on-load dependency surface because it is opened in the editor's default tab set."
open_questions:
  - "Whether the missing compatibility gateway on localhost:8080 blocks end-to-end page completion after the individual endpoints are implemented."
  - "How the CT should treat blueprint-prefill routes whose observed store paths do not match the checked-in OpenAPI contract: `/api/v1/main/blueprints/flow/{id}`, `/api/v1/main/blueprints/custom/{id}/source`, and the external `https://api.kestra.io/v1/.../source` community path."
updated_at: 2026-03-09
---

## Observed Facts

- `web-kt/src/routes/routes.js:53` maps route name `flows/create` to path `/:tenant?/flows/new` and imports `FlowCreate.vue`.
- `web-kt/src/components/flows/FlowCreate.vue:34-91` builds initial YAML from query-param variants (`copy`, `blueprintId`, `blueprintSource`, `blueprintSourceYaml`, `onboarding`, `namespace`) or from a generated default template, parses the YAML, assigns the result to `flowStore.flow`, and then calls `flowStore.initYamlSource()`.
- `web-kt/src/components/flows/FlowCreate.vue:99-103` forces `flowStore.isCreating = true`, optionally starts guided onboarding, and invokes `setupFlow()` during component setup.
- `web-kt/src/components/flows/FlowCreate.vue:105-108` clears `flowStore.flowValidation` and `flowStore.flow` on unmount.
- `web-kt/src/stores/flow.ts:344-355` shows `initYamlSource()` copying `flow.source` into `flowYaml` and `flowYamlOrigin`, calling `fetchGraph()` when the current YAML has tasks, and always calling `validateFlow()`.
- `web-kt/src/stores/flow.ts:329-341` shows `fetchGraph()` calling `loadGraphFromSource()` with a `subflows` query parameter derived from `expandedSubflows`.
- `web-kt/src/stores/flow.ts:599-633` shows `loadGraphFromSource()` posting YAML to `${apiUrl()}/flows/graph` and storing the returned graph in `flowGraph`.
- `web-kt/src/stores/flow.ts:717-746` shows `validateFlow()` posting YAML to `${apiUrl()}/flows/validate`, merging permission-based constraint text, and storing `response.data[0]` in `flowValidation`.
- `web-kt/src/override/components/flows/panelDefinition.ts:19-76` and `web-kt/src/components/flows/MultiPanelFlowEditorView.vue:96-139` show that the editor opens `code` plus `doc` by default, or `nocode` plus `doc` when local storage sets `EDITOR_VIEW_TYPE=NO_CODE`.
- `web-kt/src/components/plugins/PluginListWrapper.vue:27-33` loads `pluginsStore.listWithSubgroup({includeDeprecated: false})` on mount when the plugin cache is empty.
- `web-kt/src/components/plugins/PluginList.vue:314-316` loads plugin group icons on mount through `pluginsStore.groupIcons()`.
- `web-kt/src/stores/plugins.ts:182-188` maps the documentation panel list request to `GET ${apiUrlWithoutTenants()}/plugins/groups/subgroups`.
- `web-kt/src/stores/plugins.ts:329-333` maps plugin group icons to `GET ${apiUrlWithoutTenants()}/plugins/icons/groups`.
- `web-kt/src/components/inputs/EditorButtonsWrapper.vue:105-127` wires the save button to `flowStore.saveAll()` and routes to `flows/update` when the save outcome is `redirect_to_update`.
- `web-kt/src/stores/flow.ts:140-152` shows `saveAll()` delegating create-mode persistence to `saveWithoutRevisionGuard()`.
- `web-kt/src/stores/flow.ts:278-326` shows that create mode first calls `createFlow()`, then can fall back to `saveFlow()` after a duplicate-id confirmation, and finally returns `redirect_to_update`.
- `web-kt/src/stores/flow.ts:490-510` maps the create request to `POST ${apiUrl()}/flows` with an `application/x-yaml` body and stores the returned flow object.
- `web-kt/src/stores/flow.ts:460-475` maps the overwrite fallback to `PUT ${apiUrl()}/flows/{namespace}/{id}`.
- `web-kt/src/components/flows/FlowCreate.vue:52-63` plus `web-kt/src/stores/blueprints.ts:88-129` show query-param-dependent prefill paths: direct YAML via `blueprintSourceYaml`, community blueprint source fetch, or `getFlowBlueprint(blueprintId)`.
- `web-kt/src/stores/blueprints.ts:88-96` fetches community blueprint source from `https://api.kestra.io/v1/blueprints/kinds/flow/{id}/versions/{version}/source`, while custom blueprint source uses `${apiUrl()}/blueprints/{type}/{id}/source`.
- `web-kt/src/components/flows/useFilesPanels.ts:144-175` shows that save-all also persists dirty namespace-file tabs through `namespacesStore.saveOrCreateFile(...)`.
- `web-kt/src/composables/useBaseNamespaces.ts:205-212` maps namespace-file saves to `POST ${apiUrl()}/namespaces/{namespace}/files?path=...` with multipart form data.

## Request Shape

- Primary endpoint: the save action, because the page has no page-specific read request of its own
- Method: `POST`
- Path: `/api/v1/main/flows`
- Path params: none (tenant is provided by the compatibility boundary)
- Query params: none
- Headers:
  - `Content-Type: application/x-yaml`
- Body: YAML string representing the flow source code

## Response Shape

- Schema: `FlowWithSource`
- Top-level: single flow object, not paginated
- Key fields:
  - `id` (string)
  - `namespace` (string)
  - `revision` (integer)
  - `source` (string)
  - `description` (string, optional)
  - `disabled` (boolean)
  - `deleted` (boolean)
  - `labels` (map or label list, optional)
  - `inputs` (array, optional)
  - `tasks` (array)
  - `triggers` (array, optional)
  - `concurrency` (object, optional)
  - `variables` (object, optional)
  - `workerGroup` (object, optional)

## Secondary Endpoints

### On-load secondary endpoints

- `POST /api/v1/main/flows/validate`
  - Body: YAML string
  - Response: `ValidateConstraintViolation[]`
  - Key fields used by the page: `constraints`, `outdated`, `warnings[]`, `infos[]`, `deprecationPaths[]`
- `POST /api/v1/main/flows/graph`
  - Query params: `subflows` (comma-separated string, nullable)
  - Body: YAML string
  - Response: `FlowGraph`
  - Key fields used by the page: `nodes[]`, `edges[]`, `clusters[]`, `flowables[]`
- `GET /api/v1/plugins/groups/subgroups`
  - Response: `Plugin[]`
  - Trigger: default documentation panel mount
- `GET /api/v1/plugins/icons/groups`
  - Response: object map of plugin-group icons
  - Trigger: `PluginList` mount inside the default documentation panel

### Query-param-dependent prefill endpoints

- `GET https://api.kestra.io/v1/blueprints/kinds/flow/{id}/versions/{version}/source`
  - Trigger: `blueprintId` plus `blueprintSource=community` without inline YAML
  - Response: YAML string
- `GET /api/v1/main/blueprints/flow/{id}`
  - Trigger: `blueprintId` without `blueprintSourceYaml`
  - Response: blueprint object with `source`
- `GET /api/v1/main/blueprints/custom/{id}/source`
  - Trigger: `blueprintId` plus `blueprintSource=custom`
  - Response: YAML string

### User-activated follow-on endpoints

- `PUT /api/v1/main/flows/{namespace}/{id}`
  - Trigger: duplicate-id overwrite confirmation during create-mode save
  - Response: `FlowWithSource`
- `POST /api/v1/main/namespaces/{namespace}/files?path=...`
  - Trigger: save-all when namespace-file tabs are dirty
  - Response: not determined from code; the client ignores the body
- `GET /api/v1/main/flows/{namespace}/{id}/dependencies?destinationOnly=true`
  - Trigger: delete confirmation
  - Response: dependency graph used to build the warning dialog
- `DELETE /api/v1/main/flows/{namespace}/{id}`
  - Trigger: delete action
  - Response: none consumed by the page

## Mapping Notes

| UI field | Response field | Source column or JSON path | Notes |
| --- | --- | --- | --- |
| Flow YAML editor content after save | `source` | `kt.flows.source_code` | The initial create seed is local or blueprint-derived; after persistence the returned `FlowWithSource.source` becomes the durable page state. |
| Flow id metadata | `id` | `kt.flows.id` | Used to build the redirect target to `flows/update` after a successful create. |
| Namespace metadata | `namespace` | `kt.flows.namespace` | Also drives the redirect target and any namespace-scoped follow-on saves. |
| Revision metadata | `revision` | `kt.flows.revision` | Used by later validation/update flows after create mode ends. |
| Validation banner | `ValidateConstraintViolation.constraints`, `warnings[]`, `infos[]`, `deprecationPaths[]`, `outdated` | Computed by validation service; no direct `kt.*` column identified | Rendered through `ValidationError` in `EditorButtonsWrapper.vue`. |
| Topology canvas | `FlowGraph.nodes[]`, `edges[]`, `clusters[]`, `flowables[]` | Computed from submitted YAML; no direct `kt.*` column identified | Returned by `POST /flows/graph`, not by the primary create response. |
| Documentation panel plugin groups | `Plugin[]` from `/api/v1/plugins/groups/subgroups` | No `kt.*` mapping identified in `generated/database.types.ts` | This panel opens by default, so the plugin list is part of the effective load surface. |
| Documentation panel icons | icon map from `/api/v1/plugins/icons/groups` | No `kt.*` mapping identified in `generated/database.types.ts` | `PluginList.vue` loads the icon map on mount. |
| Namespace file save path | none consumed by the page | `kt.namespace_file_metadata.path`, `kt.namespace_file_metadata.namespace`, `kt.namespace_file_metadata.value` | Only applies when users edit namespace-file tabs and save. |
| Blueprint seed YAML | blueprint `source` string | No `kt.*` mapping identified in `generated/database.types.ts` | Prefill variants use blueprint services, not the `kt.flows` table. |

## Risks

- The frontend dev server still proxies `/api` to `http://localhost:8080`, and `page-registry.yaml` still marks the compatibility gateway as missing.
- This page depends on four distinct on-load backend surfaces before the save action is reached: `POST /flows/validate`, `POST /flows/graph`, `GET /plugins/groups/subgroups`, and `GET /plugins/icons/groups`.
- The observed blueprint-prefill paths do not line up cleanly with the checked-in OpenAPI contract. Community source fetch uses an external versioned `api.kestra.io` URL, while internal/custom blueprint paths were not found in `openapi.yml`.
- Save-all can touch `/api/v1/main/namespaces/{namespace}/files` through the namespace-files panel, which expands implementation beyond `kt.flows` into `kt.namespace_file_metadata`.
- The create save path can switch from `POST /flows` to `PUT /flows/{namespace}/{id}` after a duplicate-id confirmation. An adapter that supports only one of those branches will diverge from observed UI behavior.
