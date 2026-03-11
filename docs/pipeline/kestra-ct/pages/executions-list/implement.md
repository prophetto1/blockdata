---
doc_type: kestra_page_implementation
page_key: "executions_list"
title: "Executions list"
status: planning
target_function: "supabase/functions/kestra-executions/index.ts"
target_query_module: "supabase/functions/_shared/kestra-adapter/queries/executions.ts"
target_mapper_module: "supabase/functions/_shared/kestra-adapter/mappers/executions.ts"
runtime_targets:
  - "supabase/functions/kestra-executions/index.ts"
  - "supabase/functions/_shared/kestra-adapter/filters/executions.ts"
  - "supabase/functions/_shared/kestra-adapter/queries/executions.ts"
  - "supabase/functions/_shared/kestra-adapter/mappers/executions.ts"
test_targets:
  - "supabase/functions/kestra-executions/index.test.ts"
depends_on:
  - "kestra-ct/generated/database.types.ts (kt.executions row types)"
  - "kestra-ct/generated/kestra-contract/types.gen.ts (Execution, PagedResults_Execution_ DTOs)"
updated_at: 2026-03-09
---

## Intended Changes

- Add `kestra-executions` edge function with a handler that dispatches `GET /search` to the filter → query → mapper pipeline
- Add `filters/executions.ts` that parses pagination, sort, and `filters[field][op]` query params into a typed `ExecutionSearchParams` object
- Add `queries/executions.ts` that reads `kt.executions` rows with Supabase client, applying namespace prefix, flowId, state, text query, and time range filters, with pagination and sort
- Add `mappers/executions.ts` that converts `KtRow<"executions">` rows into Kestra `Execution` DTOs by extracting promoted columns and `value` JSON fields, including duration format conversion (numeric seconds → ISO duration string)
- Add `index.test.ts` integration test that injects fake rows and verifies the handler returns a correct `PagedResults_Execution_` payload

## File Plan

- Runtime files:
  - `supabase/functions/kestra-executions/index.ts` — new — handler entry point
  - `supabase/functions/_shared/kestra-adapter/filters/executions.ts` — new — query param parser
  - `supabase/functions/_shared/kestra-adapter/queries/executions.ts` — new — DB query module
  - `supabase/functions/_shared/kestra-adapter/mappers/executions.ts` — new — row-to-DTO mapper
- Test files:
  - `supabase/functions/kestra-executions/index.test.ts` — new — handler integration test
- CT files:
  - `kestra-ct/pages/executions-list/implement.md` — this file (modified)

## Handler Design

Follow the `kestra-flows/index.ts` pattern exactly:

```typescript
// kestra-executions/index.ts
import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createUserClient, requireUserId } from "../_shared/supabase.ts";
import { parseExecutionSearchParams } from "../_shared/kestra-adapter/filters/executions.ts";
import { searchExecutions, type ExecutionSearchResult } from "../_shared/kestra-adapter/queries/executions.ts";
import { toPagedExecutionsResponse } from "../_shared/kestra-adapter/mappers/executions.ts";

// Dependency injection pattern matching kestra-flows
type KestraExecutionsDeps = {
  requireUserId: (req: Request) => Promise<string>;
  createUserClient: typeof createUserClient;
  searchExecutions: (...) => Promise<ExecutionSearchResult>;
};

export async function handleKestraExecutionsRequest(
  req: Request,
  deps: KestraExecutionsDeps = defaultDeps,
): Promise<Response> {
  // CORS preflight → auth check → method check → route dispatch
  // GET /search → parseExecutionSearchParams → searchExecutions → toPagedExecutionsResponse
}
```

## Filter Design

Follow `filters/flows.ts` pattern. Parse these query params:

```typescript
// filters/executions.ts
export type ExecutionSearchParams = {
  page: number;
  size: number;
  sortField: "id" | "state.startDate" | "state.endDate" | "state.duration" | "namespace" | "flowId" | "state.current";
  sortDirection: "asc" | "desc";
  filters: Array<QueryFilter>;
  // Extracted convenience fields for the query layer:
  namespacePrefix?: string;
  flowIdEquals?: string;
  stateIn?: string[];
  textQuery?: string;
  timeRangeStart?: string;
  timeRangeEnd?: string;
  triggerExecutionId?: string;
};
```

Sort field mapping (frontend → DB column):
- `id` → `id`
- `state.startDate` → `start_date`
- `state.endDate` → `end_date`
- `state.duration` → `state_duration`
- `namespace` → `namespace`
- `flowId` → `flow_id`
- `state.current` → `state_current`

Filter field mapping:
- `namespace` → `namespace` column (PREFIX → `ilike`, IN → `in`, CONTAINS → `ilike`)
- `flowId` → `flow_id` column (EQUALS → `eq`, CONTAINS → `ilike`)
- `state` → `state_current` column (IN → `in`, NOT_IN → exclusion)
- `kind` → `kind` column (EQUALS → `eq`)
- `triggerExecutionId` → `trigger_execution_id` column (EQUALS → `eq`, CONTAINS → `ilike`)
- `timeRange` → relative time converted to `start_date` range filter
- `labels` → `value->labels` JSON path query
- `scope` and `childFilter` → documented but deferred if they require join logic not available in the first slice

## Query Design

Follow `queries/flows.ts` pattern:

```typescript
// queries/executions.ts
export type KtExecutionRow = KtRow<"executions">;

export type ExecutionSearchResult = {
  rows: KtExecutionRow[];
  total: number;
  error: string | null;
};

export async function searchExecutions(
  supabase: ExecutionsSupabaseClient,
  params: ExecutionSearchParams,
): Promise<ExecutionSearchResult> {
  // Build query against kt.executions
  // Select all columns: key, value, deleted, namespace, flow_id, state_current,
  //   state_duration, start_date, end_date, fulltext, id, tenant_id, trigger_execution_id, kind
  // Filter: deleted = false
  // Apply namespace prefix, flowId, state, text query, time range, trigger execution id
  // Sort by mapped DB column
  // Paginate with range()
}
```

## Mapper Design

Follow `mappers/flows.ts` pattern. Key differences from flows mapper:

1. **`value` JSON extraction is heavier** — `labels`, `flowRevision`, `inputs`, `outputs`, `taskRunList`, `trigger`, `metadata`, `state.histories` all come from `value`
2. **Duration conversion** — `kt.executions.state_duration` is numeric (seconds or milliseconds), API `state.duration` is ISO duration string (e.g., `PT1.234S`). Mapper must convert.
3. **State object construction** — assemble `{ current, startDate, endDate, duration, histories }` from promoted columns + `value` JSON

```typescript
// mappers/executions.ts
export function toExecution(row: KtExecutionRow): Execution {
  const raw = asRecord(row.value) ?? {};
  const rawState = asRecord(raw.state) ?? {};

  return {
    id: row.id,
    namespace: row.namespace,
    flowId: row.flow_id,
    flowRevision: typeof raw.flowRevision === "number" ? raw.flowRevision : 0,
    state: {
      current: row.state_current,
      startDate: row.start_date,
      endDate: row.end_date ?? undefined,
      duration: formatDuration(row.state_duration),
      histories: asArray(rawState.histories),
    },
    labels: asArray(raw.labels),
    taskRunList: asArray(raw.taskRunList),
    inputs: asRecord(raw.inputs),
    outputs: asRecord(raw.outputs),
    variables: asRecord(raw.variables),
    trigger: asRecord(raw.trigger) as Execution["trigger"],
    metadata: asRecord(raw.metadata) as Execution["metadata"],
    deleted: row.deleted,
    parentId: typeof raw.parentId === "string" ? raw.parentId : undefined,
    originalId: typeof raw.originalId === "string" ? raw.originalId : undefined,
    scheduleDate: typeof raw.scheduleDate === "string" ? raw.scheduleDate : undefined,
    kind: typeof row.kind === "string" ? row.kind : undefined,
  } as Execution;
}

export function toPagedExecutionsResponse(
  rows: KtExecutionRow[],
  total: number,
): PagedResultsExecution {
  return { results: rows.map(toExecution), total };
}

// Duration helper: numeric value → ISO 8601 duration string
function formatDuration(value: number | null): string | undefined {
  if (value === null || value === undefined) return undefined;
  // Determine if value is seconds or milliseconds based on magnitude
  // Convert to PT{seconds}.{millis}S format
}
```

## Test Design

Follow `kestra-flows/index.test.ts` pattern:

```typescript
// kestra-executions/index.test.ts
Deno.test("GET /search returns a paged Kestra-compatible executions payload", async () => {
  // Create fake KtRow<"executions"> rows with promoted columns and value JSON
  // Inject via deps
  // Assert: status 200, body.total, body.results.length
  // Assert: results[0].id, namespace, flowId, state.current, state.startDate
  // Assert: results[0].labels extracted from value JSON
  // Assert: results[0].state.duration is ISO string format
});

Deno.test("GET /search rejects requests without auth", async () => {
  // Assert: status 401
});
```

## Contract Rules

- Preserve the exact Kestra route and payload shape.
- Keep `namespace` first-class in `kt.*`.
- Do not redesign the UI while making the page work.
- Response must match `PagedResults_Execution_` schema: `{ results: Execution[], total: number }`.
- `state.duration` must be an ISO duration string, not a raw number.
- `labels` must be `Label[]` (array of `{ key, value }`), not the raw JSON blob shape.

## Verification Commands

```bash
# Run handler integration test
cd /home/jon/blockdata && deno test supabase/functions/kestra-executions/index.test.ts --allow-net --allow-read

# Type-check the handler and shared modules
cd /home/jon/blockdata && deno check supabase/functions/kestra-executions/index.ts

# Type-check the filter module
cd /home/jon/blockdata && deno check supabase/functions/_shared/kestra-adapter/filters/executions.ts

# Type-check the query module
cd /home/jon/blockdata && deno check supabase/functions/_shared/kestra-adapter/queries/executions.ts

# Type-check the mapper module
cd /home/jon/blockdata && deno check supabase/functions/_shared/kestra-adapter/mappers/executions.ts

# Verify existing flows tests still pass (no regression)
cd /home/jon/blockdata && deno test supabase/functions/kestra-flows/index.test.ts --allow-net --allow-read
```

## Shared Blocker Status

- **Compatibility gateway**: missing. End-to-end page verification is blocked. Backend adapter can be implemented and unit-tested in isolation.
- **Type promotion**: deferred. Import types from CT-staged paths (`kestra-ct/generated/...`) matching the existing flows pattern.

## Stop Conditions

- Missing bootstrap dependency
- Missing contract detail
- Response shape ambiguity
- `state.duration` format cannot be determined from DB sample data (numeric precision unclear — seconds vs milliseconds)
- `labels` storage format in `value` JSON differs from the `Label[]` array shape expected by the API (the flows mapper treats labels as a map, but the executions API expects an array of `{ key, value }` objects — must verify actual stored format)
