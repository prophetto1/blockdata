---
doc_type: kestra_page_implementation
page_key: "flows_list"
title: "Flows list"
status: completed
target_function: "supabase/functions/kestra-flows/index.ts"
target_filter_module: "supabase/functions/_shared/kestra-adapter/filters/flows.ts"
target_query_module: "supabase/functions/_shared/kestra-adapter/queries/flows.ts"
target_mapper_module: "supabase/functions/_shared/kestra-adapter/mappers/flows.ts"
runtime_targets:
  - "supabase/functions/kestra-flows/index.ts"
  - "supabase/functions/_shared/kestra-adapter/filters/flows.ts"
  - "supabase/functions/_shared/kestra-adapter/queries/flows.ts"
  - "supabase/functions/_shared/kestra-adapter/mappers/flows.ts"
test_targets:
  - "supabase/functions/kestra-flows/index.test.ts"
depends_on:
  - "CT-generated DB types at kestra-ct/generated/database.types.ts"
  - "CT-generated contract types at kestra-ct/generated/kestra-contract/types.gen.ts"
  - "Compatibility gateway availability on localhost:8080 for true end-to-end page verification"
  - "Follow-on POST /api/v1/main/executions/latest for last-execution columns"
updated_at: 2026-03-09
---

## Intended Changes

- Add a new `kestra-flows` edge function that serves the minimal `GET /api/v1/main/flows/search` slice without touching the existing Blockdata `supabase/functions/flows/` function.
- Query `kt.flows` through a shared query module and map rows into `PagedResultsFlow`.
- Keep the initial implementation read-only and limited to the fields `Flows.vue` needs for list rendering.
- Stop short of claiming full page completion if the missing compatibility gateway or `/executions/latest` dependency still blocks the route.

## File Plan

- Runtime files:
  - `supabase/functions/kestra-flows/index.ts`
  - `supabase/functions/_shared/kestra-adapter/filters/flows.ts`
  - `supabase/functions/_shared/kestra-adapter/queries/flows.ts`
  - `supabase/functions/_shared/kestra-adapter/mappers/flows.ts`
- Test files:
  - `supabase/functions/kestra-flows/index.test.ts`
- CT files:
  - `kestra-ct/pages/flows-list/capture.md`
  - `kestra-ct/pages/flows-list/implement.md`
  - `kestra-ct/pages/flows-list/verify.md`
  - `kestra-ct/pages/flows-list/results.md`
  - `kestra-ct/page-registry.yaml`

## Contract Rules

- Preserve the exact Kestra route and payload shape.
- Keep `namespace` first-class in `kt.*`.
- Do not redesign the UI while making the page work.
- Return a `PagedResultsFlow` payload with `results` and `total`.
- Do not import backend DTOs from generated SDK files; only use `kestra-ct/generated/kestra-contract/types.gen.ts`.

## Verification Commands

```bash
deno test supabase/functions/kestra-flows/index.test.ts
deno fmt supabase/functions/kestra-flows/index.ts supabase/functions/kestra-flows/index.test.ts supabase/functions/_shared/kestra-adapter/queries/flows.ts supabase/functions/_shared/kestra-adapter/mappers/flows.ts
deno test supabase/functions/kestra-flows/index.test.ts
```

## Stop Conditions

- Missing bootstrap dependency
- Missing contract detail
- Response shape ambiguity
- The page still cannot boot through `http://localhost:8080` after the endpoint code exists because the compatibility gateway remains missing.
- The page requires `/api/v1/main/executions/latest` to be implemented before the flows route can render any useful content.
