# flows_list investigation results

Date: 2026-03-09
Status: blocked_on_verification

## Confirmed frontend contract

- Route: `/:tenant?/flows`
- Component: `web-kt/src/components/flows/Flows.vue`
- Primary store call: `useFlowStore().findFlows()`
- Primary endpoint: `GET /api/v1/main/flows/search`
- Secondary page dependency: `POST /api/v1/main/executions/latest`

## Confirmed request shape

From `web-kt/src/stores/flow.ts` and `web-kt/src/components/flows/Flows.vue`:

- `findFlows()` calls `GET ${apiUrl()}/flows/search`
- `apiUrl()` resolves to `/api/v1/main`
- sort is sent as query string `?sort=<field>:<direction>`
- the remaining query state is sent as request params
- the page loads with:
  - `page`
  - `size`
  - `sort`
  - filter query params such as `filters[namespace][PREFIX]`

From `openapi.yml`:

- `GET /api/v1/{tenant}/flows/search`
- required query params:
  - `page`
  - `size`
  - `filters`
- optional query params:
  - `sort`
  - deprecated `q`
  - deprecated `scope`
  - deprecated `namespace`
  - deprecated `labels`

## Confirmed response shape

From `openapi.yml`:

- flows search returns `PagedResults_Flow_`
- top-level fields:
  - `results`
  - `total`
- each result item is `Flow`

Relevant `Flow` fields for this page:

- `id`
- `namespace`
- `revision`
- `description`
- `disabled`
- `labels`
- `triggers`

From `Flows.vue`:

- the table renders `id`
- optional columns render:
  - `labels`
  - `namespace`
  - last execution date
  - last execution status
  - execution statistics
  - triggers

From `openapi.yml`:

- `POST /api/v1/{tenant}/executions/latest` returns an array of `ExecutionController.LastExecutionResponse`
- relevant fields:
  - `id`
  - `flowId`
  - `namespace`
  - `startDate`
  - `status`

## Confirmed backend shape in repo

- Existing Blockdata function: `supabase/functions/flows/index.ts`
- It is not the Kestra list adapter.
- It serves `GET/PUT /flows/{namespace}/{id}` and `POST /flows/validate`
- It uses Blockdata project-oriented rows and is not a drop-in implementation for `GET /api/v1/main/flows/search`

- Existing shared utilities available:
  - `supabase/functions/_shared/cors.ts`
  - `supabase/functions/_shared/supabase.ts`

- Existing edge-function test style available:
  - Deno tests in `supabase/functions/flows/index.test.ts`

## Current blocker state

- `web-kt/vite.config.js` proxies `^/api` to `http://localhost:8080`
- `kestra-ct/page-registry.yaml` still records `dev_compat_gateway` as missing
- there is no finished compatibility gateway currently serving preserved Kestra paths on port `8080`

## Likely minimal runtime slice

- add `supabase/functions/kestra-flows/index.ts`
- add `supabase/functions/kestra-flows/index.test.ts`
- add `supabase/functions/_shared/kestra-adapter/filters/flows.ts`
- add `supabase/functions/_shared/kestra-adapter/queries/flows.ts`
- add `supabase/functions/_shared/kestra-adapter/mappers/flows.ts`
- optionally add a small compatibility gateway or local proxy path for `/api/v1/main/flows/search`

## Implemented in this run

1. updated `capture.md` with the sourced frontend and contract facts
2. updated `implement.md` with exact runtime targets and verification commands
3. wrote `supabase/functions/kestra-flows/index.test.ts` first
4. implemented:
   - `supabase/functions/kestra-flows/index.ts`
   - `supabase/functions/_shared/kestra-adapter/filters/flows.ts`
   - `supabase/functions/_shared/kestra-adapter/queries/flows.ts`
   - `supabase/functions/_shared/kestra-adapter/mappers/flows.ts`

## Verification outcome

- `deno test supabase/functions/kestra-flows/index.test.ts` could not run because `deno` is not installed in this workspace.
- `find supabase/functions/kestra-flows supabase/functions/_shared/kestra-adapter -maxdepth 3 -type f | sort` confirmed the new files exist.
- `web-kt/vite.config.js` still proxies `/api` to `http://localhost:8080`, so the missing compatibility gateway remains a shared blocker for true page verification.

## Remaining blockers

1. no local Deno runtime for edge-function test execution
2. no finished compatibility gateway serving preserved Kestra paths on `localhost:8080`
3. `POST /api/v1/main/executions/latest` remains unimplemented for the last-execution columns
