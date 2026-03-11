---
doc_type: kestra_page_capture
page_key: "flows_update"
title: "Flows update"
status: complete
route_traced: true
component_traced: true
store_traced: true
endpoint_traced: true
candidate_tables:
  - "kt.flows"
assumptions:
  - "The first slice implements GET /api/v1/main/flows/{namespace}/{id} before any write endpoints or secondary tab endpoints."
  - "The graph endpoint and validate endpoint are on-load dependencies that will be needed for a functional first slice."
open_questions:
  - "Whether the missing compatibility gateway on localhost:8080 blocks end-to-end page completion after the endpoint itself is implemented."
  - "Whether the validate endpoint can return a stub response initially without breaking page render."
  - "Whether the graph endpoint can return a minimal valid FlowGraph without full plugin resolution."
updated_at: 2026-03-09
---

## Observed Facts

- Route name is `flows/update`.
- Route path is `/:tenant?/flows/edit/:namespace/:id/:tab?`.
- The page component is `web-kt/src/components/flows/FlowRoot.vue`.
- FlowRoot.vue uses the `RouteContext` mixin.
- The primary store method is `useFlowStore().loadFlow()` in `web-kt/src/stores/flow.ts`.
- `loadFlow()` issues `GET ${apiUrl()}/flows/${namespace}/${id}` with params `{revision, allowDeleted, source}`.
- `apiUrl()` resolves to `${baseUrl}/api/v1/main`, so the preserved frontend contract is `GET /api/v1/main/flows/{namespace}/{id}`.
- On `created()`, if no `tab` param is present, FlowRoot redirects to `flows/update` with tab defaulting to `overview` (or localStorage `flowDefaultTab`).
- After `loadFlow` resolves, the component calls `flowStore.loadGraph({flow})` which issues `GET /api/v1/main/flows/{namespace}/{id}/graph`.
- A watcher on `flowStore.flow` calls `flowStore.loadDependencies({namespace, id}, true)` after a 1-second `setTimeout`, issuing `GET /api/v1/main/flows/{namespace}/{id}/dependencies?expandAll=false`.
- `loadFlow` internally calls `flowStore.validateFlow()` which issues `POST /api/v1/main/flows/validate` with YAML body `revision: {nextRevision}\n{source}`.
- FlowRootTopBar renders breadcrumb with link back to `flows/list` and link to `namespaces/update` for the flow's namespace.
- The page shows `this.$route.params.id` as the title.
- The `ready` computed property gates rendering: `this.user && this.flowStore.flow`. If either is falsy, the page shows nothing.
- `flowStore.isCreating` is set to `false` on created (this component is edit-only; creation uses FlowCreate.vue).
- On `unmounted()`, FlowRoot clears `flowStore.flow` and `flowStore.flowGraph`.

## Request Shape — Primary Endpoint

- Method: `GET`
- Path: `/api/v1/main/flows/{namespace}/{id}`
- Path params:
  - `namespace` (string) — flow namespace
  - `id` (string) — flow id
- Query params:
  - `source` (boolean, default false) — the store sends `source: true` implicitly (undefined means true per code)
  - `revision` (integer, nullable) — specific revision, omitted for latest
  - `allowDeleted` (boolean) — the component always sends `allowDeleted: true`
- Body: none

## Response Shape — Primary Endpoint

- Top-level: single `FlowWithSource` object (not paginated)
- Key fields:
  - `id` (string)
  - `namespace` (string)
  - `revision` (integer)
  - `description` (string, optional)
  - `disabled` (boolean)
  - `deleted` (boolean)
  - `updated` (date-time string, optional)
  - `source` (string) — YAML source code
  - `labels` (object — map of key/value pairs, optional)
  - `inputs` (array of Input objects, optional)
  - `outputs` (array of Output objects, optional)
  - `tasks` (array of Task objects, min 1)
  - `triggers` (array of AbstractTrigger, optional)
  - `errors` (array of Task, optional)
  - `finally` (array of Task, optional)
  - `afterExecution` (array of Task, optional)
  - `pluginDefaults` (array of PluginDefault, optional)
  - `concurrency` (object: `{limit, behavior}`, optional)
  - `variables` (object, optional)
  - `workerGroup` (WorkerGroup, optional)
  - `sla` (array of SLA, optional)
  - `checks` (array of Check, optional)
- If the response has `exception` field, the store treats it as a validation error and removes it from the data before setting flow state.

## Request/Response Shapes — On-Load Secondary Endpoints

### GET /api/v1/main/flows/{namespace}/{id}/graph

- Method: `GET`
- Path: `/api/v1/main/flows/{namespace}/{id}/graph`
- Query params:
  - `revision` (integer, nullable)
  - `subflows` (comma-separated string of subflow task IDs to expand)
- Response: `FlowGraph` object
  - `nodes` (array of AbstractGraph: `{uid, type, branchType?}`)
  - `edges` (array of `{source, target, relation}`)
  - `clusters` (array of `{cluster, nodes, parents, start, end}`)
  - `flowables` (array of strings)

### GET /api/v1/main/flows/{namespace}/{id}/dependencies

- Method: `GET`
- Path: `/api/v1/main/flows/{namespace}/{id}/dependencies`
- Query params:
  - `expandAll` (boolean) — component sends `false` for the badge count, `true` for full view
  - `destinationOnly` (boolean) — used by delete confirmation only
- Response: `FlowTopologyGraph` object
  - `nodes` (array of `{uid, namespace, id}`)
  - `edges` (array of `{source, target, relation}` where relation is `FLOW_TASK` or `FLOW_TRIGGER`)

### POST /api/v1/main/flows/validate

- Method: `POST`
- Path: `/api/v1/main/flows/validate`
- Headers: `Content-Type: application/x-yaml`
- Body: YAML string (flow source with `revision: N` prepended)
- Response: array of `ValidateConstraintViolation`
  - `[0].constraints` (string, optional)
  - `[0].outdated` (boolean, optional)
  - `[0].deprecationPaths` (array of strings, optional)
  - `[0].warnings` (array of strings, optional)
  - `[0].infos` (array of strings, optional)

## Tab Surface — Secondary Endpoints (Future Slices)

Each tab calls additional endpoints when activated. These are documented for completeness but are not primary scope.

| Tab | Component | Endpoint(s) | Store |
| --- | --- | --- | --- |
| overview | Overview.vue | `GET /api/v1/main/executions/search` (filtered by namespace+flowId) | executionsStore |
| topology | Topology.vue | `GET /api/v1/main/flows/{ns}/{id}/graph` (already on-load) | flowStore |
| executions | FlowExecutions.vue | `GET /api/v1/main/executions/search` (filtered by namespace+flowId) | executionsStore |
| edit | MultiPanelFlowEditorView.vue | No direct calls; child panels may call validate/graph | flowStore |
| revisions | FlowRevisions.vue | `GET /api/v1/main/flows/{ns}/{id}/revisions`, `GET /api/v1/main/flows/{ns}/{id}?revision=N` | flowStore |
| triggers | FlowTriggers.vue | `GET /api/v1/main/triggers/search`, plus 6 trigger mutation endpoints | triggerStore |
| logs | LogsWrapper.vue | `GET /api/v1/main/logs/search` | logsStore |
| metrics | FlowMetrics.vue | `GET /api/v1/main/metrics/tasks/{ns}/{id}`, `GET /api/v1/main/metrics/names/{ns}/{id}`, `GET /api/v1/main/metrics/aggregates/{ns}/{id}/{metric}` | flowStore |
| dependencies | Dependencies.vue | `GET /api/v1/main/flows/{ns}/{id}/dependencies?expandAll=true` (already counted on load) | flowStore |
| concurrency | FlowConcurrency.vue | `GET /api/v1/main/concurrency-limit/search` (direct axios, not via store) | direct axios |
| auditlogs | DemoAuditLogs.vue | Demo component, no real API calls | none |

## Mapping Notes

| UI element | Response field | Source column or JSON path | Notes |
| --- | --- | --- | --- |
| Page title | `id` | `kt.flows.id` | Shown in FlowRootTopBar as `$route.params.id` |
| Namespace breadcrumb | `namespace` | `kt.flows.namespace` | Links to `namespaces/update` |
| Flows list breadcrumb | — | — | Static link to `flows/list` route |
| Deleted banner | `deleted` | `kt.flows.deleted` | FlowRoot tracks `this.deleted` from loaded flow |
| YAML editor content | `source` | `kt.flows.source_code` | Set as `flowYaml` and `flowYamlOrigin` |
| Revision display | `revision` | `kt.flows.revision` | Used for validation and revision comparison |
| Labels | `labels` | `kt.flows.value.labels` | Used by various UI elements |
| Triggers | `triggers` | `kt.flows.value.triggers` | Trigger tab reads from flow object |
| Inputs | `inputs` | `kt.flows.value.inputs` | Used by execution trigger dialog |
| Tasks | `tasks` | `kt.flows.value.tasks` | Topology rendering and task navigation |
| Disabled state | `disabled` | `kt.flows.value.disabled` | Used for enable/disable toggle |
| Description | `description` | `kt.flows.value.description` | Shown in overview |
| Concurrency | `concurrency` | `kt.flows.value.concurrency` | Concurrency tab reads from flow |
| Updated timestamp | `updated` | `kt.flows.updated` | Shown in revision/metadata views |
| Dependency count badge | dependencies response `.nodes.length - 1` | computed from graph traversal | Shown as tab badge, 0 hides badge |
| Validation errors | validate response `[0].constraints` | computed from YAML validation | Shown as editor error banner |
| Graph visualization | graph response `.nodes`, `.edges`, `.clusters` | computed from flow YAML parsing | Topology tab renders via LowCodeEditor |

## Risks

- The frontend dev server proxies `/api` to `http://localhost:8080`, and `page-registry.yaml` still marks the compatibility gateway as missing.
- The page calls 4 endpoints on initial load (`loadFlow`, `loadGraph`, `loadDependencies`, `validateFlow`). All must return valid shapes for the page to fully render without errors.
- The `ready` computed requires both `user` (from authStore) and `flow` (from flowStore) to be truthy. If auth bootstrap fails, the page shows nothing.
- The graph endpoint may require plugin resolution to produce a valid `FlowGraph` — this could be a blocker if the plugin surface is not stubbed.
- The validate endpoint sends YAML to the backend for parsing — this requires a YAML-aware validation handler or stub.
- 11 tab sub-pages each bring their own endpoint dependencies, significantly expanding the full compatibility surface of this single page.
- The `FlowConcurrency` tab makes a direct `axios.get()` call to `/concurrency-limit/search` rather than using a store, which is a different pattern from other tabs.
- The existing `supabase/functions/flows/index.ts` is Blockdata/project-oriented and is not a drop-in for the Kestra flow detail route.
