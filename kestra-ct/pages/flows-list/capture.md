---
doc_type: kestra_page_capture
page_key: "flows_list"
title: "Flows list"
status: completed
route_traced: true
component_traced: true
store_traced: true
endpoint_traced: true
candidate_tables:
  - "kt.flows"
  - "kt.executions"
  - "kt.triggers"
assumptions:
  - "The first slice will implement `GET /api/v1/main/flows/search` before `POST /api/v1/main/executions/latest`."
open_questions:
  - "Whether the missing compatibility gateway on localhost:8080 blocks end-to-end page completion after the endpoint itself is implemented."
updated_at: 2026-03-09
---

## Observed Facts

- Route name is `flows/list`.
- Route path is `/:tenant?/flows`.
- The page component is `web-kt/src/components/flows/Flows.vue`.
- The primary store method is `useFlowStore().findFlows()` in `web-kt/src/stores/flow.ts`.
- `findFlows()` issues `GET ${apiUrl()}/flows/search`.
- `apiUrl()` resolves to `${baseUrl}/api/v1/main`, so the preserved frontend contract is `GET /api/v1/main/flows/search`.
- `Flows.vue` also calls `executionsStore.loadLatestExecutions()` after the flows response loads in order to populate the last-execution columns.
- `loadLatestExecutions()` posts to `/api/v1/main/executions/latest`.

## Request Shape

- Method: `GET`
- Path: `/api/v1/main/flows/search`
- Query params:
  - `page`
  - `size`
  - `sort`
  - `filters`
  - deprecated compatibility params that still exist in the OpenAPI contract: `q`, `scope`, `namespace`, `labels`
- Body: none

## Response Shape

- Top-level fields:
  - `results`
  - `total`
- List field: `results`
- Detail fields:
  - `Flow.id`
  - `Flow.namespace`
  - `Flow.revision`
  - `Flow.description`
  - `Flow.disabled`
  - `Flow.labels`
  - `Flow.triggers`
  - secondary page dependency fields from `ExecutionControllerLastExecutionResponse`: `id`, `flowId`, `namespace`, `startDate`, `status`

## Mapping Notes

| UI field | Response field | Source column or JSON path | Notes |
| --- | --- | --- | --- |
| Flow id link | `results[].id` | `kt.flows.id` | The page links to `flows/update` using `namespace` and `id`. |
| Description tooltip | `results[].description` | `kt.flows.value.description` or `kt.flows.source_code`-derived metadata | `Flows.vue` renders a markdown tooltip beside the id. |
| Namespace column | `results[].namespace` | `kt.flows.namespace` | Only shown when the optional namespace column is enabled. |
| Labels column | `results[].labels` | `kt.flows.value.labels` | OpenAPI allows labels as a map; the UI renders them through `Labels.vue`. |
| Triggers column | `results[].triggers` | `kt.flows.value.triggers` | `TriggerAvatar` expects a flow object with `triggers`. |
| Last execution date | `ExecutionControllerLastExecutionResponse.startDate` | `kt.executions.start_date` | Populated by the follow-on `/executions/latest` call, not by the primary flows endpoint. |
| Last execution status | `ExecutionControllerLastExecutionResponse.status` | `kt.executions.state_current` | Also populated by the follow-on `/executions/latest` call. |

## Risks

- The frontend dev server proxies `/api` to `http://localhost:8080`, and `page-registry.yaml` still marks the compatibility gateway as missing.
- `GET /api/v1/main/flows/search` is not sufficient for a full “done” page because `Flows.vue` also requests `POST /api/v1/main/executions/latest`.
- The existing `supabase/functions/flows/index.ts` is Blockdata/project-oriented and is not a drop-in implementation for the Kestra list route.
