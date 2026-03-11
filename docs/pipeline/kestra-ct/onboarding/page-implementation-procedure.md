# Page Implementation Procedure

This is the step-by-step procedure for phase 3 of page work: **implement**. It assumes phases 1-2 (packet + capture) are already complete. Phase 4 (verify) is handled separately, possibly by a different worker.

This procedure produces one completed document (`implement.md`) and the runtime code to back the page's primary endpoint.

## Prerequisites

Before starting, you must have:

1. Read the completed `packet.md` and `capture.md` in the page directory. These are your scope lock and observed facts.
2. Read `kestra-ct/onboarding/adapter-layout.md`. This is where runtime files go.
3. Confirmed `ct_status` is `packet_seeded` in `page-registry.yaml`.
4. Confirmed your side status is `capturing` or `planning` (not `not_started` — investigation must be done first).

## Inputs

You need these references throughout:

| Source | Location | What it tells you |
| --- | --- | --- |
| Packet | `kestra-ct/pages/<page-key>/packet.md` | Scope, success criteria, stop conditions |
| Capture | `kestra-ct/pages/<page-key>/capture.md` | Request/response shapes, mapping table, risks |
| Adapter layout | `kestra-ct/onboarding/adapter-layout.md` | Where handler, query, mapper, filter files go |
| Database types | `kestra-ct/generated/database.types.ts` | `kt.*` table columns and types |
| Contract types | `kestra-ct/generated/kestra-contract/types.gen.ts` | Kestra API response shapes |

## Step 1: Check Shared Blockers

Before planning any code, check whether the page can actually work end-to-end.

Check each of these:

- [ ] Is the compatibility gateway serving `/api/v1/main/...` routes? (Check `page-registry.yaml` `shared_prerequisites` section)
- [ ] Are bootstrap endpoints available (`/api/v1/configs`, `/api/v1/basicAuthValidationErrors`)?
- [ ] Are there blockers listed in the packet's `blockers` field?
- [ ] Are there risks in the capture's Risks section that block implementation?

If a shared prerequisite is missing:

- Do not invent a page-local workaround.
- Set your side status to `blocked` in the registry.
- Record the blocker in `implement.md` under Stop Conditions.
- Stop. Do not write runtime code against a path that cannot be tested.

If shared blockers exist but you can still implement and unit-test the backend adapter in isolation (endpoint returns correct shape, tests pass), you may proceed with a note that end-to-end verification is blocked.

## Step 2: Name Exact File Targets

Using the adapter layout and the capture's endpoint list, write down every file you will create or modify.

For each file, specify:

- Full path from repo root
- Whether it is new or modified
- What it does (handler, query, mapper, filter, test, config)

### Required file targets for a typical page

| Role | Path pattern | Notes |
| --- | --- | --- |
| Handler | `supabase/functions/kestra-<domain>/index.ts` | Entry point, dispatches by route/method |
| Handler test | `supabase/functions/kestra-<domain>/index.test.ts` | Integration test for the handler |
| Handler config | `supabase/functions/kestra-<domain>/config.toml` | Supabase function config |
| Filter | `supabase/functions/_shared/kestra-adapter/filters/<domain>.ts` | Normalizes query params into typed filter object |
| Query | `supabase/functions/_shared/kestra-adapter/queries/<domain>.ts` | Reads `kt.*` rows, returns typed DB rows |
| Query test | `supabase/functions/_shared/kestra-adapter/queries/<domain>.test.ts` | Unit test for query module |
| Mapper | `supabase/functions/_shared/kestra-adapter/mappers/<domain>.ts` | Converts DB rows to Kestra DTOs |
| Mapper test | `supabase/functions/_shared/kestra-adapter/mappers/<domain>.test.ts` | Unit test for mapper module |

Not every page needs all files. A page that shares a domain with an existing handler (e.g., `flows_update` shares `kestra-flows` with `flows_list`) may only need new query/mapper functions added to existing modules.

If a file already exists from a previous page in the same domain, you add to it — do not create a second module.

If you cannot name exact file paths, the plan is not ready. Stop and investigate further.

## Step 3: Write implement.md

Overwrite the existing stub at `kestra-ct/pages/<page-key>/implement.md`.

Fill in:

- **Frontmatter**: Set `status: planning`. Fill `target_function`, `target_query_module`, `target_mapper_module` with exact paths. Fill `runtime_targets` and `test_targets` arrays.
- **Intended Changes**: Bullet list of what you will build. One bullet per logical unit (handler route, query function, mapper function, filter function).
- **File Plan**: Three sections — Runtime files, Test files, CT files. Each lists exact paths and whether new or modified.
- **Contract Rules**: Copy from the stub (preserve Kestra shape, keep namespace first-class, no UI redesign). Add any page-specific rules from the packet.
- **Verification Commands**: Exact commands to run. Include: test command, dev server start, curl/fetch to test the endpoint shape. Do not write "TBD" — write the actual commands even if they cannot run yet due to shared blockers.
- **Stop Conditions**: List anything that would halt implementation.

## Step 4: Build with TDD

Follow this order strictly. Do not skip steps.

### 4a: Write a failing test first

Write the smallest test that proves the primary behavior works:

- For a list page: test that the query returns rows and the mapper shapes them correctly.
- For a detail page: test that the query returns a single row and the mapper produces the expected DTO.

Run the test. Confirm it fails. If it passes without implementation, the test is wrong.

### 4b: Implement the filter layer

If the endpoint accepts query params (pagination, search, sort, filters), implement the filter module first.

- Parse query string params into a typed filter object.
- Do not touch the database here.
- Do not shape the response here.

### 4c: Implement the query layer

Write the query module that reads from `kt.*` tables.

- Import DB row types from `kestra-ct/generated/database.types.ts` (or from `_shared/database.types.ts` if types have been promoted).
- Accept the typed filter object from Step 4b.
- Return typed DB rows. Do not convert to Kestra DTOs here.
- Use the column-to-field mappings from the capture's Mapping Notes table.

### 4d: Implement the mapper layer

Write the mapper module that converts DB rows to Kestra API DTOs.

- Import DB row types from database types.
- Import Kestra DTO types from `kestra-ct/generated/kestra-contract/types.gen.ts` (or from `_shared/kestra-contract/` if promoted).
- This is the only place DB types and contract types meet.
- Use the capture's Response Shape section as the target output.
- Handle the `value` JSON column: extract nested fields like `value.description`, `value.labels`, `value.triggers`.

### 4e: Implement the handler

Write the handler entry point at `supabase/functions/kestra-<domain>/index.ts`.

- Parse the HTTP request (method, path, query params).
- Call the filter module to normalize params.
- Call the query module to get DB rows.
- Call the mapper module to convert to DTOs.
- Return the response in the exact shape from the capture's Response Shape section.
- For paginated endpoints: return `{ results: [...], total: N }`.
- For detail endpoints: return the single DTO object.

### 4f: Run the test again

Run the test from Step 4a. It should pass now.

If it fails, fix the implementation. Do not modify the test to make it pass unless the test itself was wrong (and document why).

### 4g: Wire the frontend (only if necessary)

Most pages should not require frontend changes. The compatibility adapter is designed so `web-kt` thinks it is talking to a real Kestra backend.

Only modify frontend files if:

- The packet's `files_in_scope` explicitly names a frontend file to modify.
- The capture identified a code path that cannot work without a small change.

If you modify a frontend file, record exactly what you changed and why in `implement.md`.

## Step 5: Update implement.md Status

After building:

- Set `status: complete` in the frontmatter.
- Confirm all file targets in the File Plan have been created.
- Confirm all verification commands are written (not "TBD").
- Update `updated_at` to today's date.

## Step 6: Update the Registry

Open `kestra-ct/page-registry.yaml`. Update your side status:

- If implementation is complete and ready for verification: set your side to `verifying`.
- If implementation is blocked: set your side to `blocked` and document the blocker.
- If implementation is partially complete: set your side to `partial` and document what remains.

Do not touch `ct_status` unless the shared packet state has changed.

## Step 7: Update README.md

Update `kestra-ct/pages/<page-key>/README.md` to reflect that implementation is complete and the page is ready for verification:

```
This page has been implemented. Read `packet.md` for scope, `capture.md` for observed facts, and `implement.md` for what was built. Verification is next — follow `verify.md` and the verification matrix at `kestra-ct/onboarding/verification-matrix.md`.
```

## The Adapter Pattern (Quick Reference)

```
Handler (index.ts)      parses HTTP, calls filter + query + mapper, returns response
  |
Filter (filters/X.ts)   normalizes query string into typed filter object
  |
Query (queries/X.ts)    reads kt.* rows using DB types, returns typed rows
  |
Mapper (mappers/X.ts)   converts DB rows into Kestra API DTOs
```

- DB types and Kestra contract types meet ONLY in mapper modules.
- Queries never import Kestra DTOs.
- Handlers never inline SQL or large response-shape construction.
- Filters never touch the database.

## Type Usage Rules

- During early slices, import types directly from CT-staged files:
  - `kestra-ct/generated/database.types.ts`
  - `kestra-ct/generated/kestra-contract/types.gen.ts`
- Do not copy types into `_shared/` yourself. Type promotion is a separate hardening task.
- Do not import from `sdk/*.gen.ts`. Backend adapter code uses CT-generated types only.

## Identity Rule

- `kt.*` is Kestra-native. `namespace` is first-class.
- Do not introduce `project_id` into `kt.*` adapter code, DTOs, or endpoint semantics.
- If a Blockdata crosswalk is needed, it lives outside the `kt.*` compatibility surface.

## What NOT To Do

- Do not start implementation if the packet and capture are not complete.
- Do not modify `supabase/functions/flows/` (that is the Blockdata flow system, not yours).
- Do not change files outside the packet's `files_in_scope`.
- Do not redesign the UI. You are building compatibility, not rethinking UX.
- Do not skip TDD. Write the test first, watch it fail, then implement.
- Do not claim implementation is done without runnable verification commands in `implement.md`.
- Do not combine multiple pages into one implementation. One page at a time.
- Do not update `ct_status` — that tracks the shared packet lifecycle, not your implementation progress.

## Reference

| Document | Purpose |
| --- | --- |
| `kestra-ct/onboarding/adapter-layout.md` | Runtime file placement and naming |
| `kestra-ct/onboarding/adapter-readme.md` | Short adapter pattern guide |
| `kestra-ct/onboarding/verification-matrix.md` | Commands and evidence expectations |
| `kestra-ct/decisions.md` | Architectural decisions that override defaults |
| `kestra-ct/generated/database.types.ts` | `kt` schema row types |
| `kestra-ct/generated/kestra-contract/types.gen.ts` | Kestra API contract types |
