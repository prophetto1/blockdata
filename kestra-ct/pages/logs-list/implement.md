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
  - "supabase/functions/_shared/kestra-adapter/filters/logs.ts"
  - "supabase/functions/_shared/kestra-adapter/queries/logs.ts"
  - "supabase/functions/_shared/kestra-adapter/mappers/logs.ts"
test_targets:
  - "supabase/functions/kestra-logs/index.test.ts"
  - "supabase/functions/_shared/kestra-adapter/mappers/logs.test.ts"
depends_on:
  - "CT-generated DB types at kestra-ct/generated/database.types.ts"
  - "CT-generated contract types at kestra-ct/generated/kestra-contract/types.gen.ts"
  - "Compatibility gateway availability on localhost:8080 for true end-to-end page verification"
  - "Shared HTTP helpers at supabase/functions/_shared/kestra-adapter/http/ (errors.ts, query.ts, response.ts)"
updated_at: 2026-03-09
---

## Intended Changes

- Add a new `kestra-logs` edge function that serves the minimal `GET /api/v1/main/logs/search` slice without touching any existing Blockdata functions.
- Query `kt.logs` through a shared query module and map rows into `PagedResultsLogEntry`.
- Extract `thread`, `message`, and `index` from the `value` JSON column in the mapper since they are not top-level columns.
- Implement level threshold filtering: `minLevel=INFO` must match INFO, WARN, and ERROR rows using level ordering (TRACE < DEBUG < INFO < WARN < ERROR).
- Support date range filtering on `kt.logs.timestamp` using `startDate` and `endDate` query params.
- Support namespace, flowId, and triggerId filters with comparator semantics (EQUALS, CONTAINS, STARTS_WITH, ENDS_WITH, IN, NOT_IN, PREFIX).
- Keep the initial implementation read-only and limited to the fields `LogLine.vue` needs for rendering.
- Stop short of claiming full page completion if the missing compatibility gateway or timeseries chart dependency still blocks the route.

## File Plan

- Runtime files:
  - `supabase/functions/kestra-logs/index.ts` (new — handler entry point)
  - `supabase/functions/kestra-logs/config.toml` (new — Supabase function config)
  - `supabase/functions/_shared/kestra-adapter/filters/logs.ts` (new — normalizes query params into typed filter object)
  - `supabase/functions/_shared/kestra-adapter/queries/logs.ts` (new — queries `kt.logs`, returns typed DB rows)
  - `supabase/functions/_shared/kestra-adapter/mappers/logs.ts` (new — converts DB rows to `LogEntry` DTOs)
- Test files:
  - `supabase/functions/kestra-logs/index.test.ts` (new — handler integration test)
  - `supabase/functions/_shared/kestra-adapter/mappers/logs.test.ts` (new — mapper unit test for JSON extraction and level mapping)
- CT files:
  - `kestra-ct/pages/logs-list/capture.md` (updated during investigation)
  - `kestra-ct/pages/logs-list/implement.md` (this file)
  - `kestra-ct/pages/logs-list/verify.md` (to be updated after verification)
  - `kestra-ct/page-registry.yaml` (status update)

## Handler Design

The handler dispatches on method and path within the `kestra-logs` function boundary:

- `GET /api/v1/main/logs/search` → `searchLogs` handler path
  1. Parse query params through filter module.
  2. Call query module with normalized filters.
  3. Call mapper module to convert rows to `LogEntry[]`.
  4. Return `{ results: LogEntry[], total: number }` as JSON.

## Filter Design

`parseLogSearchParams(url: URL)` returns a typed filter object:

- `page: number` (default 1)
- `size: number` (default 25)
- `sort: string` (default `timestamp:desc`)
- `minLevel: Level | null` (threshold filter)
- `startDate: string | null` (ISO datetime)
- `endDate: string | null` (ISO datetime)
- `namespace: { comparator: string, value: string }[] | null`
- `flowId: { comparator: string, value: string }[] | null`
- `triggerId: { comparator: string, value: string }[] | null`

The filter module parses both the `filters[key][comparator]` format and the deprecated flat params (`q`, `namespace`, `flowId`, `triggerId`, `minLevel`, `startDate`, `endDate`).

## Query Design

`queryLogs(client, filters)` builds a Supabase query against `kt.logs`:

- Base: `client.from("logs").select("*", { count: "exact" })`
- Level threshold: where `level` in levels at or above `minLevel`. Level order: `TRACE < DEBUG < INFO < WARN < ERROR`.
- Date range: `.gte("timestamp", startDate).lte("timestamp", endDate)`
- Namespace filters: apply comparator logic (eq, like, in, etc.)
- FlowId, triggerId filters: same comparator mapping.
- Pagination: `.range(offset, offset + size - 1)` where `offset = (page - 1) * size`.
- Sort: parse `field:direction` and apply `.order(field, { ascending })`.
- Returns `{ rows: KtLogsRow[], count: number }`.

## Mapper Design

`toLogEntry(row: KtLogsRow): LogEntry` maps one DB row:

| DB column | LogEntry field | Transform |
| --- | --- | --- |
| `level` | `level` | Direct (enum match). |
| `timestamp` | `timestamp` | Direct (string). |
| `namespace` | `namespace` | Direct. |
| `flow_id` | `flowId` | Rename. |
| `execution_id` | `executionId` | Rename, nullable. |
| `task_id` | `taskId` | Rename, nullable. |
| `taskrun_id` | `taskRunId` | Rename, nullable. |
| `attempt_number` | `attemptNumber` | Rename, nullable. |
| `trigger_id` | `triggerId` | Rename, nullable. |
| `execution_kind` | `executionKind` | Rename, nullable. |
| `value->'thread'` | `thread` | JSON extraction from `value` column. |
| `value->'message'` | `message` | JSON extraction from `value` column. |
| `value->'index'` | `index` | JSON extraction from `value` column, cast to number. |

`toPagedResultsLogEntry(rows, count)` wraps: `{ results: rows.map(toLogEntry), total: count }`.

## Contract Rules

- Preserve the exact Kestra route and payload shape.
- Keep `namespace` first-class in `kt.*`.
- Do not redesign the UI while making the page work.
- Return a `PagedResultsLogEntry` payload with `results` and `total`.
- Do not import backend DTOs from generated SDK files; only use `kestra-ct/generated/kestra-contract/types.gen.ts`.

## Verification Commands

```bash
deno test supabase/functions/kestra-logs/index.test.ts
deno test supabase/functions/_shared/kestra-adapter/mappers/logs.test.ts
deno fmt supabase/functions/kestra-logs/index.ts supabase/functions/kestra-logs/index.test.ts supabase/functions/_shared/kestra-adapter/queries/logs.ts supabase/functions/_shared/kestra-adapter/mappers/logs.ts supabase/functions/_shared/kestra-adapter/filters/logs.ts
```

## Stop Conditions

- Missing bootstrap dependency.
- Missing contract detail.
- Response shape ambiguity.
- The `value` JSON column does not contain expected `thread`, `message`, or `index` fields.
- The page still cannot boot through `http://localhost:8080` after the endpoint code exists because the compatibility gateway remains missing.
- Level threshold filtering cannot be implemented without confirmed level ordering semantics.
