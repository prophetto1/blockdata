# KT Worker System

> **Required Skills:** `using-superpowers`, `brainstorming`, `writing-plans`, `executing-plans`
>
> **Required Reasoning Step:** use sequential thinking before writing the capture doc or plan.

## Purpose

This system forces every worker to implement one Kestra-compatible page in the same order, with the same artifacts, and with the same stop conditions.

Use it when a worker is assigned one page in `web-kt` to wire against Supabase `kt.*` tables through Kestra-compatible backend endpoints.

## Hard Rules

- Implement one page only.
- Do not redesign the page.
- Do not improve unrelated code.
- Match Kestra's API contract exactly for the assigned page.
- Keep mapping logic isolated in one mapper module per domain.
- Read-only slice first unless the assignment explicitly says otherwise.
- No product-path implementation before the capture doc exists.
- No implementation before the plan exists.
- No completion claim before the verification doc contains evidence.
- Backend mappers must use CT-staged types from `kt-ct/generated/database.types.kt.ts` and `kt-ct/generated/kestra-api/types.gen.ts`.
- Backend mappers must not import from `kt-ct/generated/kestra-api/sdk/*.gen.ts`.

## Required Artifacts

Create these three files before coding:

1. `kt-ct/tasks/<page_key>.capture.md`
2. `kt-ct/tasks/<page_key>.plan.md`
3. `kt-ct/tasks/<page_key>.verify.md`

Templates:

- `kt-ct/tasks/page.capture.template.md`
- `kt-ct/tasks/page.plan.template.md`
- `kt-ct/tasks/page.verify.template.md`

## Required Workflow

### Phase 1: Trace

1. Use `using-superpowers`.
2. Use sequential thinking to break down the page.
3. Use `brainstorming` to confirm the page boundary and success criteria.
4. Trace:
   - route
   - page component
   - store or composable call
   - generated client method, if present
   - upstream Kestra endpoint in `openapi.yml`
   - candidate `kt.*` tables
5. Fill out the capture file using facts only.

### Phase 2: Plan

1. Use `writing-plans`.
2. Write a task-by-task plan for one vertical slice only.
3. Include:
   - exact files to modify
   - failing test first
   - backend endpoint work
   - query layer work
   - mapper work
   - page wiring work
   - verification commands
4. Save the plan in the task file.

### Phase 3: Implement

1. Use `executing-plans`.
2. Execute the plan in small batches.
3. Stop immediately if:
   - the real contract differs from the capture doc
   - the page needs more endpoints than planned
   - auth or tenant behavior is unclear
   - the worker is drifting into redesign
   - backend code needs a type that exists only in `sdk/*.gen.ts`

### Phase 4: Verify

1. Record only proven facts in the verify file.
2. Include:
   - commands run
   - tests run
   - screenshots if used
   - exact failures if unresolved
3. Do not mark a field verified unless evidence exists.

## Page Boundary Guidance

Good first assignments:

- `flows_list`
- `flow_detail`
- `executions_list`

Bad assignments:

- "all flows"
- "flows plus executions"
- "wire the UI"
- "redesign flows while wiring"

## Recommended Backend Shape

Each page should usually map to:

- one route handler
- one query module
- one mapper module
- one small set of tests

Example for `flows_list`:

- route: `GET /api/v1/main/flows/search`
- table: `kt.flows`
- query: page, size, sort, q
- response: exact Kestra `PagedResults_Flow_`

## Backend Type Rule

For backend code:

- use `kt-ct/generated/database.types.kt.ts` for DB row typing
- use `kt-ct/generated/kestra-api/types.gen.ts` for API DTO typing
- do not import from `kt-ct/generated/kestra-api/sdk/*.gen.ts`

Reason:

- `kt-ct/generated/kestra-api/sdk/ks-shared.gen.ts` imports `vue-router`
- the generated SDK layer is therefore not backend-safe as staged

