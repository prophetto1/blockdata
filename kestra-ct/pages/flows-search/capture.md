---
doc_type: kestra_page_capture
page_key: "flows_search"
title: "Flows search"
status: complete
route_traced: true
component_traced: true
store_traced: true
endpoint_traced: true
candidate_tables:
  - "kt.flows"
assumptions:
  - "The first slice will implement GET /api/v1/main/flows/source only."
  - "The namespace autocomplete endpoint (POST /api/v1/main/namespaces/autocomplete) is a user-activated secondary dependency and may be deferred."
open_questions:
  - "Whether the missing compatibility gateway on localhost:8080 blocks end-to-end page completion after the endpoint itself is implemented."
  - "Whether the backend full-text search that produces [mark] delimited fragments requires Postgres full-text search configuration or can use simpler pattern matching against kt.flows.source_code."
updated_at: 2026-03-09
---

## Observed Facts

- Route name is `flows/search`.
- Route path is `/:tenant?/flows/search`.
- The page component is `web-kt/src/components/flows/FlowsSearch.vue`.
- The primary store method is `useFlowStore().searchFlows()` in `web-kt/src/stores/flow.ts` (line 376).
- `searchFlows()` issues `GET ${apiUrl()}/flows/source` with `sort` extracted as a query string suffix and remaining params passed via axios `params`.
- `apiUrl()` resolves to `${baseUrl}/api/v1/main`, so the preserved frontend contract is `GET /api/v1/main/flows/source`.
- The store sets `search.value = response.data.results` and `total.value = response.data.total`.
- The component uses `useDataTableActions({ loadData })` composable from `web-kt/src/composables/useDataTableActions.ts`.
- `useDataTableActions` watches `route.query` and calls `loadData` on any change (line 165-174).
- `queryWithFilter()` merges route query params (including `q`, `namespace`, `page`, `size`, `sort`) into the request params.
- If `params.q` is falsy after the request completes, the component sets `flowStore.total = 0` and `flowStore.search = undefined` — search requires a non-empty query string.
- The component renders results as `el-card` elements. Each card header is a `router-link` to `/flows/edit/${item.model.namespace}/${item.model.id}/source`.
- Fragment strings contain `[mark]` and `[/mark]` delimiters. The `sanitize()` function (line 100) escapes all HTML via `lodash/escape`, then replaces `[mark]`/`[/mark]` with `<mark>`/`</mark>` tags. The result is rendered via `v-html`.
- The breadcrumb links back to `flows/list`.
- `NamespaceSelect` component calls `namespacesStore.loadAutocomplete()` via `POST ${apiUrlWithTenant(route)}/namespaces/autocomplete` with body `{ q?: string, ids?: string[] }`. This is user-activated (triggered by typing in the namespace filter), not on-load.
- Sub-components `TopNavBar`, `DataTable`, `SearchField`, `NoData` are layout/filter components with no independent API calls.

## Request Shape

- Method: `GET`
- Path: `/api/v1/main/flows/source`
- Path params: none (tenant is handled by the proxy/base URL)
- Query params:
  - `q` (string, nullable) — the search string; required for results to render
  - `namespace` (string, nullable) — namespace prefix filter
  - `page` (integer, default 1) — current page number
  - `size` (integer, default 10) — page size
  - `sort` (string array, nullable) — sort order, passed as `?sort=field:asc|desc` suffix by the store
- Body: none

## Response Shape

- Schema: `PagedResults<SearchResult<Flow>>` (OpenAPI: `PagedResults_SearchResult_Flow__`)
- Top-level fields:
  - `results` — array of `SearchResultFlow`
  - `total` — integer count of all matching results
- Each `SearchResultFlow` contains:
  - `model` — a `Flow` object with: `id`, `namespace`, `revision`, `description`, `disabled`, `labels`, `deleted`, `tasks`, `triggers`, `inputs`, `workerGroup`, `variables`, etc.
  - `fragments` — array of strings, each containing a source code snippet with `[mark]`/`[/mark]` delimiters around matched terms

## Secondary Endpoints

### Namespace Autocomplete (user-activated)

- Method: `POST`
- Path: `/api/v1/main/namespaces/autocomplete`
- Body: `{ q?: string, ids?: string[] }`
- Response: `string[]` (list of namespace names)
- Trigger: User types in the NamespaceSelect dropdown filter

## Mapping Notes

| UI field | Response field | Source column or JSON path | Notes |
| --- | --- | --- | --- |
| Card header link text | `results[].model.namespace` + `results[].model.id` | `kt.flows.namespace`, `kt.flows.id` | Rendered as `namespace.id`, linked to `/flows/edit/{namespace}/{id}/source`. |
| Card header link target | `results[].model.namespace`, `results[].model.id` | `kt.flows.namespace`, `kt.flows.id` | Router-link to `flows/update` page. |
| Code fragment snippets | `results[].fragments[]` | Derived from `kt.flows.source_code` via full-text search | Backend generates fragments with `[mark]` delimiters; frontend sanitizes and renders as `<mark>` HTML. |
| Pagination total | `total` | Count of matching rows in `kt.flows` | Drives the DataTable pagination control. |
| Namespace filter options | Namespace autocomplete response | Not directly from `kt.flows`; from `POST /api/v1/main/namespaces/autocomplete` | Secondary endpoint, user-activated only. |

## Risks

- The frontend dev server proxies `/api` to `http://localhost:8080`, and `page-registry.yaml` still marks the compatibility gateway as missing.
- The fragment highlighting relies on the backend producing `[mark]`/`[/mark]` delimited strings from full-text search against `source_code`. The adapter must replicate this behavior — simple substring matching may not produce the same fragment structure as Kestra's native search.
- The `NamespaceSelect` dropdown depends on `POST /api/v1/main/namespaces/autocomplete`, which is outside the flows domain adapter. If this endpoint is not implemented, the namespace filter will not populate options (though the page will still function for keyword-only searches).
- The `sort` parameter is handled specially by the store: it's extracted from the params object and appended as a query string suffix (`?sort=...`). The adapter must accept sort as a query parameter, not as a body field.
