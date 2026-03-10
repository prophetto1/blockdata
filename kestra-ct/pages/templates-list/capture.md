---
doc_type: kestra_page_capture
page_key: "templates_list"
title: "Templates list"
status: complete
route_traced: true
component_traced: true
store_traced: true
endpoint_traced: true
candidate_tables:
  - "kt.templates"
assumptions:
  - "The `value` JSON column in `kt.templates` contains a full Kestra Template object including a `description` field."
  - "The response shape follows the same paginated envelope pattern as other Kestra list endpoints: `{ results: Template[], total: number }`."
  - "Since Templates are not in the OpenAPI spec, the response fields must be inferred from store and component usage."
open_questions:
  - "Whether the compatibility gateway on localhost:8080 blocks end-to-end page completion after the endpoint itself is implemented."
  - "The exact fields in the Template response object beyond id, namespace, and description — the store types it as `any`."
  - "Whether the `deleted` column in `kt.templates` should be filtered (exclude soft-deleted rows) or returned as-is."
updated_at: 2026-03-09
---

## Observed Facts

- Route name is `templates/list`.
- Route path is `/:tenant?/templates`.
- The page component is `web-kt/src/components/templates/Templates.vue`.
- The component uses Options API with mixins: `RouteContext`, `RestoreUrl`, `DataTableActions`, `SelectTableActions`.
- The primary store method is `useTemplateStore().findTemplates()` in `web-kt/src/stores/template.ts`.
- `findTemplates()` extracts the `sort` param from options and appends it directly as a URL query string: `` `${apiUrl()}/templates/search?sort=${options.sort}` ``. The remaining params (`page`, `size`, plus any filter params) are passed via axios `params`.
- `apiUrl()` resolves to `${baseUrl}/api/v1/main`, so the preserved frontend contract is `GET /api/v1/main/templates/search`.
- Default pagination: `page=1`, `size=25`.
- Default sort: `id:asc`.
- The component provides two filter controls in the navbar: `SearchField` (maps to `q` query param via `RestoreUrl` mixin) and `NamespaceSelect` (maps to `namespace` query param).
- The component does NOT use `KSFilter` — it uses simpler `SearchField` + `NamespaceSelect` controls directly.
- `Templates.vue` renders a `SelectTable` with three columns:
  1. `id` column (sortable): renders a `router-link` to `templates/update` with `{namespace, id}` params, plus a `MarkdownTooltip` showing `scope.row.description`.
  2. `namespace` column (sortable): renders the namespace value with invisible space formatting.
  3. Action column: an `IconButton` linking to `templates/update`.
- The `SelectTable` supports row selection for bulk operations (export, delete) via `BulkSelect` component.
- Bulk operations are exposed: export by IDs, export by query, delete by IDs, delete by query, import via file upload. All are out of first-slice scope.
- Permission checks use `permission.FLOW` and `action.READ`/`action.DELETE` (not a template-specific permission).
- The store's `templates` ref is typed as `any[] | undefined` — no typed Template interface exists in the store.
- Templates are NOT in the OpenAPI specification (`openapi.yml`). The `Templates` tag is defined at the top level but no endpoint paths or response schemas exist. The `isTemplateEnabled` config field is the only template-related schema entry.
- No generated contract types exist for Template in `kestra-ct/generated/kestra-contract/types.gen.ts`.
- The `TemplatesDeprecated` component is rendered above the main content section — it likely shows a deprecation notice. Its implementation was not traced as it is not part of the data flow.

## Request Shape

- Method: `GET`
- Path: `/api/v1/main/templates/search`
- Query params:
  - `sort` (string, default `id:asc`, appended directly to URL path by the store)
  - `page` (integer, default 1)
  - `size` (integer, default 25)
  - `q` (string, search text from `SearchField`)
  - `namespace` (string, from `NamespaceSelect`)
- Body: none

## Response Shape

- Top-level fields:
  - `results`
  - `total`
- List field: `results` (array of Template objects)
- Template object fields (inferred from component usage — no OpenAPI schema available):
  - `id` (string) — used in column, router-link, row key, and selection mapper
  - `namespace` (string) — used in column, router-link, row key, and selection mapper
  - `description` (string, likely nullable) — used in `MarkdownTooltip` for each row

## Mapping Notes

| UI field | Response field | Source column or JSON path | Notes |
| --- | --- | --- | --- |
| ID link | `results[].id` | `kt.templates.id` | Top-level column. Links to `templates/update/{namespace}/{id}`. |
| Description tooltip | `results[].description` | `kt.templates.value->'description'` | JSON extraction from `value` column. Rendered via `MarkdownTooltip`. May be null. |
| Namespace column | `results[].namespace` | `kt.templates.namespace` | Top-level column. Formatted with invisible space utility. |
| Row key | `${namespace}-${id}` | `kt.templates.namespace`, `kt.templates.id` | Composite key used by SelectTable. |

## Risks

- **No OpenAPI spec for templates.** The `Templates` tag exists but no endpoint paths or schemas are defined. Response shape is inferred from store code and component usage only. This means the adapter cannot validate its output against a contract spec.
- **No generated contract types.** The `kestra-ct/generated/kestra-contract/types.gen.ts` file has no Template types. The adapter must define its own Template type or use inline types.
- The frontend dev server proxies `/api` to `http://localhost:8080`, and `page-registry.yaml` still marks the compatibility gateway as missing.
- `description` is not a top-level column in `kt.templates`. It must be extracted from the `value` JSON column.
- The `deleted` column exists in `kt.templates`. The query must filter out soft-deleted rows (`deleted = false`) unless the original Kestra endpoint returns them.
- The store appends `sort` directly to the URL path rather than as an axios param. The adapter must parse sort from the URL query string, not from a dedicated sort parameter in the request body.
- **Templates domain is not in `adapter-layout.md`.** The frozen layout only plans `kestra-flows`, `kestra-executions`, and `kestra-logs`. A `kestra-templates` function would be a new domain requiring a decision update or exception.
