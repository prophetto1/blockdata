---
doc_type: kestra_page_implementation
page_key: "templates_list"
title: "Templates list"
status: planning
target_function: "supabase/functions/kestra-templates/index.ts"
target_filter_module: "supabase/functions/_shared/kestra-adapter/filters/templates.ts"
target_query_module: "supabase/functions/_shared/kestra-adapter/queries/templates.ts"
target_mapper_module: "supabase/functions/_shared/kestra-adapter/mappers/templates.ts"
runtime_targets:
  - "supabase/functions/kestra-templates/index.ts"
  - "supabase/functions/_shared/kestra-adapter/filters/templates.ts"
  - "supabase/functions/_shared/kestra-adapter/queries/templates.ts"
  - "supabase/functions/_shared/kestra-adapter/mappers/templates.ts"
test_targets:
  - "supabase/functions/kestra-templates/index.test.ts"
  - "supabase/functions/_shared/kestra-adapter/mappers/templates.test.ts"
depends_on:
  - "CT-generated DB types at kestra-ct/generated/database.types.ts"
  - "Compatibility gateway availability on localhost:8080 for true end-to-end page verification"
  - "Decision update to add kestra-templates to adapter-layout.md (currently only flows/executions/logs are planned)"
updated_at: 2026-03-09
---

## Intended Changes

- Add a new `kestra-templates` edge function that serves the minimal `GET /api/v1/main/templates/search` slice.
- Query `kt.templates` through a shared query module and map rows into a paginated Template list.
- Extract `description` from the `value` JSON column in the mapper since it is not a top-level column.
- Filter out soft-deleted rows (`deleted = false`).
- Support `q` (search text) and `namespace` filters, plus `sort` and pagination.
- Define a local `Template` type in the mapper since no OpenAPI-generated contract type exists.
- Keep the initial implementation read-only and limited to the fields `Templates.vue` needs for list rendering.

## Adapter Layout Gap

**Important:** The frozen `adapter-layout.md` only plans three domains: `kestra-flows`, `kestra-executions`, `kestra-logs`. Templates is not listed. This implementation plan follows the same pattern but adds a fourth domain (`kestra-templates`). This should be recorded as a decision update in `kestra-ct/decisions.md` before execution begins.

## File Plan

- Runtime files:
  - `supabase/functions/kestra-templates/index.ts` (new — handler entry point)
  - `supabase/functions/kestra-templates/config.toml` (new — Supabase function config)
  - `supabase/functions/_shared/kestra-adapter/filters/templates.ts` (new — normalizes query params)
  - `supabase/functions/_shared/kestra-adapter/queries/templates.ts` (new — queries `kt.templates`, returns typed DB rows)
  - `supabase/functions/_shared/kestra-adapter/mappers/templates.ts` (new — converts DB rows to Template DTOs, defines local Template type)
- Test files:
  - `supabase/functions/kestra-templates/index.test.ts` (new — handler integration test)
  - `supabase/functions/_shared/kestra-adapter/mappers/templates.test.ts` (new — mapper unit test for JSON extraction)
- CT files:
  - `kestra-ct/pages/templates-list/capture.md` (updated during investigation)
  - `kestra-ct/pages/templates-list/implement.md` (this file)
  - `kestra-ct/pages/templates-list/verify.md` (to be updated after verification)
  - `kestra-ct/page-registry.yaml` (status update)
  - `kestra-ct/decisions.md` (new decision: add templates domain to adapter layout)

## Handler Design

The handler dispatches on method and path within the `kestra-templates` function boundary:

- `GET /api/v1/main/templates/search` → `searchTemplates` handler path
  1. Parse query params (including `sort` from URL query string) through filter module.
  2. Call query module with normalized filters.
  3. Call mapper module to convert rows to `Template[]`.
  4. Return `{ results: Template[], total: number }` as JSON.

## Filter Design

`parseTemplateSearchParams(url: URL)` returns a typed filter object:

- `page: number` (default 1)
- `size: number` (default 25)
- `sort: string` (default `id:asc`, parsed from URL query string)
- `q: string | null` (search text)
- `namespace: string | null` (namespace filter)

Note: The frontend sends `sort` as a direct URL query param (appended to path by the store), not as an axios param. The filter module must parse it from `url.searchParams.get("sort")`.

## Query Design

`queryTemplates(client, filters)` builds a Supabase query against `kt.templates`:

- Base: `client.from("templates").select("*", { count: "exact" })`
- Filter: `.eq("deleted", false)` (exclude soft-deleted rows)
- Search: if `q` is set, `.ilike("fulltext", `%${q}%`)` or `.textSearch("fulltext", q)` — depends on fulltext column usage
- Namespace: if set, `.eq("namespace", namespace)` or `.ilike("namespace", `${namespace}%`)` for prefix matching
- Pagination: `.range(offset, offset + size - 1)` where `offset = (page - 1) * size`
- Sort: parse `field:direction` from sort string and apply `.order(field, { ascending })`
  - Map `id` → `id`, `namespace` → `namespace`
- Returns `{ rows: KtTemplatesRow[], count: number }`

## Mapper Design

Since no OpenAPI-generated Template type exists, define a local type:

```typescript
interface Template {
  id: string;
  namespace: string;
  description?: string | null;
}
```

`toTemplate(row: KtTemplatesRow): Template` maps one DB row:

| DB column | Template field | Transform |
| --- | --- | --- |
| `id` | `id` | Direct. |
| `namespace` | `namespace` | Direct. |
| `value->'description'` | `description` | JSON extraction from `value` column, nullable. |

`toPagedResultsTemplate(rows, count)` wraps: `{ results: rows.map(toTemplate), total: count }`.

**Open question:** The original Kestra backend may return additional fields in the Template object (e.g., `tasks`, `errors`, `listeners`, `triggers`). The minimal adapter returns only the fields the list UI actually reads. If detail views or other pages need more fields, the mapper can be expanded later.

## Contract Rules

- Preserve the exact Kestra route and payload shape.
- Keep `namespace` first-class in `kt.*`.
- Do not redesign the UI while making the page work.
- Return a paginated payload with `results` and `total`.
- Since no generated contract types exist, define the minimal Template type locally in the mapper module.

## Verification Commands

```bash
deno test supabase/functions/kestra-templates/index.test.ts
deno test supabase/functions/_shared/kestra-adapter/mappers/templates.test.ts
deno fmt supabase/functions/kestra-templates/index.ts supabase/functions/kestra-templates/index.test.ts supabase/functions/_shared/kestra-adapter/queries/templates.ts supabase/functions/_shared/kestra-adapter/mappers/templates.ts supabase/functions/_shared/kestra-adapter/filters/templates.ts
```

## Stop Conditions

- Missing bootstrap dependency.
- Response shape ambiguity that cannot be resolved from store and component code alone.
- The `value` JSON column does not contain expected `description` field.
- The page still cannot boot through `http://localhost:8080` after the endpoint code exists because the compatibility gateway remains missing.
- Decision to add `kestra-templates` domain is not approved — adapter-layout.md must be updated first.
