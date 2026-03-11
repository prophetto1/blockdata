# Flows List Adapter — Verification Plan

## Purpose

This document ensures any worker (fresh or compacted) can verify the flows-list adapter implementation is correct. It is the single source of truth for what "done" means and how to prove it.

## Context

- **What was built:** A `kestra-flows` Supabase edge function that serves `GET /api/v1/main/flows/search` by querying `kt.flows` and returning a `PagedResultsFlow`-shaped response.
- **Implementation plan:** `kestra-ct/plans/2026-03-10-flows-list-adapter-implementation-plan.md`
- **Page packet:** `kestra-ct/pages/flows-list/packet.md`
- **Page capture:** `kestra-ct/pages/flows-list/capture.md`

## Files That Must Exist After Implementation

| # | Path | Role |
|---|------|------|
| 1 | `supabase/functions/kestra-flows/config.toml` | Function config |
| 2 | `supabase/functions/kestra-flows/index.ts` | Handler entry point |
| 3 | `supabase/functions/kestra-flows/index.test.ts` | Handler integration test |
| 4 | `supabase/functions/_shared/kestra-adapter/filters/flows.ts` | Filter module |
| 5 | `supabase/functions/_shared/kestra-adapter/filters/flows.test.ts` | Filter unit test |
| 6 | `supabase/functions/_shared/kestra-adapter/queries/flows.ts` | Query module |
| 7 | `supabase/functions/_shared/kestra-adapter/queries/flows.test.ts` | Query unit test |
| 8 | `supabase/functions/_shared/kestra-adapter/mappers/flows.ts` | Mapper module |
| 9 | `supabase/functions/_shared/kestra-adapter/mappers/flows.test.ts` | Mapper unit test |
| 10 | `supabase/functions/_shared/kestra-adapter/http/response.ts` | HTTP response helpers |

## File Existence Check

```bash
ls -1 \
  supabase/functions/kestra-flows/config.toml \
  supabase/functions/kestra-flows/index.ts \
  supabase/functions/kestra-flows/index.test.ts \
  supabase/functions/_shared/kestra-adapter/filters/flows.ts \
  supabase/functions/_shared/kestra-adapter/filters/flows.test.ts \
  supabase/functions/_shared/kestra-adapter/queries/flows.ts \
  supabase/functions/_shared/kestra-adapter/queries/flows.test.ts \
  supabase/functions/_shared/kestra-adapter/mappers/flows.ts \
  supabase/functions/_shared/kestra-adapter/mappers/flows.test.ts \
  supabase/functions/_shared/kestra-adapter/http/response.ts
```

Expected: all 10 files listed, no errors.

## Test Commands

### Run all adapter tests

```bash
deno test supabase/functions/_shared/kestra-adapter/ supabase/functions/kestra-flows/
```

Expected: all tests pass, zero failures.

### Run tests individually (for debugging)

```bash
deno test supabase/functions/_shared/kestra-adapter/mappers/flows.test.ts
deno test supabase/functions/_shared/kestra-adapter/filters/flows.test.ts
deno test supabase/functions/_shared/kestra-adapter/queries/flows.test.ts
deno test supabase/functions/kestra-flows/index.test.ts
```

## What Each Test Proves

### Mapper tests (`mappers/flows.test.ts`)

- [x] `mapFlowRow` converts a full `kt.flows` row (with description, labels, triggers, inputs, tasks) into the correct `Flow` DTO shape
- [x] `mapFlowRow` handles a minimal row (empty `value` JSON) without crashing — defaults missing fields gracefully

### Filter tests (`filters/flows.test.ts`)

- [x] `parseFlowSearchParams` extracts `page`, `size`, `sort` from query string
- [x] `parseFlowSearchParams` applies sane defaults when params are missing (page=1, size=25, sort=id:asc)
- [x] `parseFlowSearchParams` captures `filters[namespace][PREFIX]` and `q` params

### Query tests (`queries/flows.test.ts`)

- [x] `queryFlows` calls the Supabase client with schema `kt`, table `flows`, and returns `{ rows, total }`
- [x] Mock client validates the query chain is built correctly

### Handler tests (`index.test.ts`)

- [x] GET request returns status 200 with `{ results: Flow[], total: number }` — the `PagedResultsFlow` shape
- [x] Non-GET request returns status 405

## Contract Shape Verification

The handler response must match `PagedResultsFlow` from `kestra-ct/generated/kestra-contract/types.gen.ts`:

```typescript
{
  results: Array<{
    id: string;           // from kt.flows.id
    namespace: string;    // from kt.flows.namespace
    revision: number;     // from kt.flows.revision
    description?: string; // from kt.flows.value.description
    disabled: boolean;    // from kt.flows.value.disabled
    deleted: boolean;     // from kt.flows.deleted
    labels?: Record<string, string>; // from kt.flows.value.labels
    triggers?: Array<{ id: string; type: string }>;  // from kt.flows.value.triggers
    inputs?: Array<{ id: string; type: string }>;     // from kt.flows.value.inputs
    tasks?: Array<{ id: string; type: string }>;      // from kt.flows.value.tasks
    source?: string;      // from kt.flows.source_code
    updated?: string;     // from kt.flows.updated
  }>;
  total: number;          // from Supabase count
}
```

## Architectural Rules to Verify

These are invariants from the onboarding docs. Check them during code review:

- [ ] Mapper is the ONLY place DB types and contract types meet
- [ ] Query module does NOT import any Kestra DTO types
- [ ] Handler does NOT inline SQL or large response-shape construction
- [ ] Filter does NOT touch the database
- [ ] No `project_id` anywhere in the adapter code
- [ ] `namespace` is used as a first-class field (not derived from project)
- [ ] Imports use CT-staged types (`kestra-ct/generated/`), not `sdk/*.gen.ts`
- [ ] Existing `supabase/functions/flows/` is untouched

## Registry State After Completion

In `kestra-ct/page-registry.yaml`, the `flows_list` entry should show:

```yaml
windows_status: verifying
```

## Known Blockers (Not Part of This Verification)

These are shared prerequisites that remain missing. They do NOT block the adapter unit tests but DO block end-to-end page verification:

- Dev compatibility gateway on `localhost:8080` — missing
- Bootstrap endpoints (`/api/v1/configs`, `/api/v1/basicAuthValidationErrors`) — missing
- `POST /api/v1/main/executions/latest` (secondary dependency for last-execution columns) — not implemented

## What "Done" Means

**Backend adapter done** (this scope):
1. All 10 files exist
2. All tests pass
3. Architectural invariants hold
4. Registry updated to `windows_status: verifying`

**Page fully done** (future scope, after shared blockers resolved):
1. Dev server starts
2. Route `/ui/main/flows` loads
3. `GET /api/v1/main/flows/search` returns correct shape through the gateway
4. Rows render in `Flows.vue`
5. Search and sort work

## Recovery Instructions for a Compacted Worker

If you are a fresh worker picking this up mid-implementation:

1. Read `kestra-ct/onboarding/session-orientation.md`
2. Read `kestra-ct/onboarding/worker-instructions.md`
3. Read this file (you are here)
4. Run the file existence check above to see what has been created so far
5. Run the test commands to see what passes
6. Resume from the first failing or missing piece
7. The implementation plan at `kestra-ct/plans/2026-03-10-flows-list-adapter-implementation-plan.md` has the exact code for each task