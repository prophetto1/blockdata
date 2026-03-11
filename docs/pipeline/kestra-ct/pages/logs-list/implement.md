---
doc_type: kestra_page_implementation
page_key: "logs_list"
title: "Logs list"
status: planning
target_function: "supabase/functions/kestra-logs/index.ts"
target_filter_module: "supabase/functions/_shared/kestra-adapter/filters/logs.ts"
target_query_module: "supabase/functions/_shared/kestra-adapter/queries/logs.ts"
target_mapper_module: "supabase/functions/_shared/kestra-adapter/mappers/logs.ts"
runtime_targets:
  - "supabase/functions/kestra-logs/index.ts"
  - "supabase/functions/kestra-logs/config.toml"
  - "supabase/functions/_shared/kestra-adapter/filters/logs.ts"
  - "supabase/functions/_shared/kestra-adapter/queries/logs.ts"
  - "supabase/functions/_shared/kestra-adapter/mappers/logs.ts"
test_targets:
  - "supabase/functions/kestra-logs/index.test.ts"
depends_on:
  - "CT-generated DB types at kestra-ct/generated/database.types.ts"
  - "CT-generated contract types at kestra-ct/generated/kestra-contract/types.gen.ts"
  - "Compatibility gateway availability on localhost:8080 for true end-to-end page verification"
updated_at: 2026-03-10
---

## Intended Changes

- Add a new `kestra-logs` edge function that serves `GET /api/v1/main/logs/search` without touching any existing functions.
- Add a filter module to normalize `page`, `size`, `sort`, `minLevel`, `startDate`, `endDate`, `namespace`, `flowId`, `triggerId`, and `filters` query params into a typed filter object. Handle `minLevel` as a level-threshold filter (e.g., `minLevel=INFO` returns INFO, WARN, ERROR).
- Add a query module to read `kt.logs` rows with typed DB rows, applying filter predicates for namespace, flowId, triggerId, level threshold, timestamp range, and pagination/sort.
- Add a mapper module to convert DB rows to `LogEntry` DTOs, extracting `message` and `thread` from the `value` JSON column.
- Return a `PagedResultsLogEntry` envelope: `{ results: LogEntry[], total: number }`.
- Keep the initial implementation read-only and limited to the fields `LogsWrapper.vue` and `LogLine.vue` need for list rendering.

## File Plan

- Runtime files:
  - `supabase/functions/kestra-logs/index.ts` (new — handler entrypoint)
  - `supabase/functions/kestra-logs/config.toml` (new — Supabase function config)
  - `supabase/functions/_shared/kestra-adapter/filters/logs.ts` (new — filter module)
  - `supabase/functions/_shared/kestra-adapter/queries/logs.ts` (new — query module)
  - `supabase/functions/_shared/kestra-adapter/mappers/logs.ts` (new — mapper module)
- Test files:
  - `supabase/functions/kestra-logs/index.test.ts` (new — handler integration test)
- CT files:
  - `kestra-ct/pages/logs-list/capture.md` (modified — completed)
  - `kestra-ct/pages/logs-list/implement.md` (modified — this file)
  - `kestra-ct/pages/logs-list/verify.md` (to be filled after verification)
  - `kestra-ct/page-registry.yaml` (modified — status update)

## Contract Rules

- Preserve the exact Kestra route and payload shape.
- Keep `namespace` first-class in `kt.*`.
- Do not redesign the UI while making the page work.
- Return a `PagedResultsLogEntry` payload with `results` and `total`.
- Do not import backend DTOs from generated SDK files; only use `kestra-ct/generated/kestra-contract/types.gen.ts`.
- Handle `minLevel` as a level-threshold filter: given a minimum level, include all entries at that level and above (ERROR > WARN > INFO > DEBUG > TRACE).

## Verification Commands

```bash
deno test supabase/functions/kestra-logs/index.test.ts
deno fmt supabase/functions/kestra-logs/index.ts supabase/functions/kestra-logs/index.test.ts supabase/functions/_shared/kestra-adapter/filters/logs.ts supabase/functions/_shared/kestra-adapter/queries/logs.ts supabase/functions/_shared/kestra-adapter/mappers/logs.ts
```

## Stop Conditions

- Missing bootstrap dependency
- Missing contract detail
- Response shape ambiguity
- The page still cannot boot through `http://localhost:8080` after the endpoint code exists because the compatibility gateway remains missing.
- The `minLevel` threshold ordering cannot be determined from the OpenAPI spec or code (resolved: ordering is ERROR > WARN > INFO > DEBUG > TRACE as defined in the `Level` enum).
