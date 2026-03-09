# Kestra Windows Worker Execution Instructions

## Purpose

Use this file on the Windows side as the detailed operating manual for Kestra compatibility work.

This file is for execution, not preparation. Preparation is already complete. `kestra-ct` is the canonical control tower. `docs-approved/reference/kt-ct` is reference material only.

The first live slice is `flows_list`.

## Repo Orientation

Expected Windows repo root: `E:\writing-system\`

All paths in this file are repo-relative unless an absolute path is explicitly written.

Examples:

- `kestra-ct/page-registry.yaml` means `E:\writing-system\kestra-ct\page-registry.yaml`
- `web-kt/src/routes/routes.js` means `E:\writing-system\web-kt\src\routes\routes.js`
- `supabase/functions/kestra-flows/index.ts` means `E:\writing-system\supabase\functions\kestra-flows\index.ts`

## Document Authority

Use the files in this order:

1. `kestra-ct/onboarding/session-orientation.md`
2. `kestra-ct/onboarding/status-model.md`
3. `kestra-ct/onboarding/worker-instructions.md`
4. `kestra-ct/onboarding/page-worker-loop.md`
5. this file
6. the assigned page packet

Authority rule:

- `worker-instructions.md` defines the general invariant rules
- this file defines the Windows execution overlay
- if the two differ on Windows-specific execution details, this file wins

## Canonical Sources Of Truth

Read and obey these files in this order before changing any runtime code:

1. `kestra-ct/plans/2026-03-09-kestra-integration-preparation-implementation-plan.md`
2. `kestra-ct/onboarding/session-orientation.md`
3. `kestra-ct/onboarding/status-model.md`
4. `kestra-ct/onboarding/worker-instructions.md`
5. `kestra-ct/onboarding/page-worker-loop.md`
6. `kestra-ct/onboarding/adapter-layout.md`
7. `kestra-ct/onboarding/web-kt-baseline.md`
8. `kestra-ct/onboarding/verification-matrix.md`
9. `kestra-ct/pages/flows-list/packet.md`
10. `kestra-ct/generated/database.types.ts`
11. `kestra-ct/generated/kestra-contract/types.gen.ts`

If any of those files conflict with chat history, follow the files.

## Hard Rules

- Use `kestra-ct` as the only live CT.
- Do not use `docs-approved/reference/kt-ct` as a second active CT.
- Implement one page only.
- Do not redesign the UI.
- Do not widen scope without updating the packet first.
- Keep `kt.*` Kestra-native.
- `namespace` is first-class.
- Do not introduce `project_id` into the `kt.*` compatibility surface.
- Do not claim success without fresh verification evidence.
- Do not import backend DTO types from `sdk/*.gen.ts`.
- Do not write new preparatory artifacts outside `kestra-ct/`.

## Required Skill And Reasoning Order

The worker must use this order:

1. `using-superpowers`
2. sequential thinking before capture or planning
3. `brainstorming` only if the packet or contract is ambiguous
4. `writing-plans` before runtime implementation
5. `executing-plans` during implementation
6. `verification-before-completion` before any success claim

If the worker skips sequential thinking, packet review, or verification, stop the run.

## Sequential Thinking Requirement

Sequential thinking for one page means the worker must explicitly break the page down before capture or planning.

Minimum breakdown:

1. identify the route
2. identify the request method and path
3. identify the expected response envelope
4. identify the target backend files
5. identify bootstrap blockers
6. identify verification commands

If no sequential-thinking tool is available, write this breakdown as bullet notes before filling `capture.md`.

## Directory Roles

Use these directories exactly as follows:

- `kestra-ct/`
  Holds packet, capture, implement, verify, plans, baseline docs, generated CT references, and assessments.
- `web-kt/`
  Holds the copied Kestra frontend workspace.
- `supabase/functions/`
  Holds runtime adapter functions and shared backend code once implementation starts.
- `docs-approved/reference/kt-ct/`
  Reference only. Read it if useful. Do not treat it as the active workflow root.

## Current Shared Prerequisite Reality

As of `2026-03-09`:

- there is no finished compatibility gateway running on `localhost:8080`
- no runtime currently serves Kestra-compatible `/api/v1/main/...` paths by default
- the gateway or proxy is a shared prerequisite, not an implicit page-local detail

This means a page worker must not pretend endpoint verification is available if the gateway does not exist.

Use the current rule:

- if the gateway is missing, mark the page `blocked` on the shared prerequisite
- do not invent a private page-only transport workaround unless the packet explicitly assigns gateway work

## First Assignment

The first assignment is `flows_list`.

The worker must treat this as:

- route: `/:tenant?/flows`
- first frontend URL in dev: `/ui/main/flows`
- primary upstream contract: `GET /api/v1/main/flows/search`
- primary table: `kt.flows`
- secondary dependency: `POST /api/v1/main/executions/latest`

The first slice is read-only. Do not add create, edit, delete, import, export, enable, disable, or execute behavior in the first pass.

Current `page-registry.yaml` meaning for this page:

- `ct_status: packet_seeded` means the shared packet exists and the worker should start with capture
- it does not mean the page is implemented
- it does not mean the page is verified
- it does not mean the shared prerequisites already exist

## Required Reading For `flows_list`

Before writing the capture doc, inspect:

- `web-kt/src/components/flows/Flows.vue`
- `web-kt/src/stores/flow.ts`
- `web-kt/src/stores/executions.ts`
- `web-kt/src/routes/routes.js`
- `openapi.yml`

Confirm:

- the route shape
- the store method
- the request method and path
- the expected response envelope
- the page-critical fields rendered in the table
- the page-critical query parameters

## Required Artifact Chain

For the `flows_list` worker, the required files are:

- `kestra-ct/pages/flows-list/packet.md`
- `kestra-ct/pages/flows-list/capture.md`
- `kestra-ct/pages/flows-list/implement.md`
- `kestra-ct/pages/flows-list/verify.md`

These files must be used in this order:

1. read `packet.md`
2. fill `capture.md`
3. fill `implement.md`
4. execute runtime work
5. fill `verify.md`

Do not start runtime implementation before the capture and implement docs exist and are specific.

## Phase 1: Capture

The capture doc must contain observed facts only.

The worker must record:

- actual route
- actual page component
- actual store method
- actual request method
- actual request path
- actual query params
- actual top-level response shape
- actual list field
- actual UI-to-response field mapping candidates
- actual candidate `kt.*` tables

The worker must not put guesses, fixes, or intentions in `capture.md`.

If the worker cannot determine the upstream response shape from code and `openapi.yml`, stop and escalate.

## Phase 2: Implementation Plan

The implement doc must become a real execution plan, not a placeholder.

It must name exact runtime targets:

- route handler path
- query module path
- mapper module path
- test file paths
- frontend file paths to touch, if any

For `flows_list`, the expected runtime target shape is:

- `supabase/functions/kestra-flows/index.ts`
- `supabase/functions/_shared/kestra-adapter/queries/flows.ts`
- `supabase/functions/_shared/kestra-adapter/mappers/flows.ts`
- matching test files under the same domain

Do not modify `supabase/functions/flows/` for this work.

That existing function belongs to the Blockdata flow system. The Kestra adapter must live in the separate `kestra-flows` function namespace.

The plan must include:

- failing test first
- query implementation
- mapper implementation
- endpoint implementation
- frontend wiring only if necessary
- verification commands

If the worker cannot write exact file targets, the plan is not ready.

## Phase 3: Runtime Implementation

Implementation must follow the adapter layout exactly.

Use these boundaries:

- handlers parse HTTP and return responses
- queries fetch typed `kt.*` rows
- mappers convert typed rows into Kestra DTOs

Do not:

- shape large JSON payloads directly in the handler
- query the database from `web-kt`
- bypass the mapper layer
- import from `kestra-contract/sdk/*.gen.ts`

For backend typing:

- use `kestra-ct/generated/database.types.ts` as the CT-side DB type reference
- use `kestra-ct/generated/kestra-contract/types.gen.ts` as the CT-side API DTO reference

If a needed API type exists only through the generated SDK layer, stop and escalate.

## Type Promotion Rule

Do not invent a type-promotion step during page execution.

Current rule:

- use the CT-staged type files directly as the active reference during early implementation
- do not copy them into `_shared/` as part of a normal page slice
- treat runtime promotion into `supabase/functions/_shared/` as a separate hardening task after the early slices prove stable

## Bootstrap Dependency Rule

The worker must not assume `flows/search` is enough for the page to boot.

Before calling the page wired, the worker must account for the known bootstrap dependencies from `kestra-ct/onboarding/web-kt-baseline.md`:

- `/api/v1/configs`
- `/api/v1/basicAuthValidationErrors`
- `/api/v1/plugins/...` for broader shell health
- `/oauth/access_token` if auth flows are exercised

For the first slice, the minimum acceptable path is:

- the shell can reach the flows page route
- the page can issue `GET /api/v1/main/flows/search`
- the page can render rows without boot-time failure

If the page fails before it reaches the target endpoint because bootstrap endpoints are missing, record that as a blocker instead of forcing unrelated page changes.

The same rule applies if the compatibility gateway is missing.

## Verification Requirements

The worker must record exact commands before running them.

Minimum verification for `flows_list`:

- generate command, if rerun
- dev server command
- endpoint verification command
- page verification command
- any targeted tests

Minimum proof for success:

- dev server starts
- the flows route loads
- `GET /api/v1/main/flows/search` returns the expected Kestra-compatible shape
- rows render
- search works
- sort or pagination works if exposed in the first slice

If any one of those is missing, do not claim the page is done.

## Windows-Side Discipline Rules

- Prefer repo-relative paths in notes so the artifacts stay portable between Windows and Ubuntu.
- Do not create a second Windows-only CT tree.
- Do not copy reference artifacts into active CT paths unless you are deliberately promoting a specific improvement.
- Keep chat summaries short. Put durable facts in the CT files.
- If the Windows run discovers a divergence from Ubuntu, write the divergence into the CT doc that owns the topic.

## Approved Uses Of `docs-approved/reference/kt-ct`

The worker may read `docs-approved/reference/kt-ct` for:

- stronger wording for worker instructions
- backend import guardrails
- stricter DB type ideas
- reference OpenAPI config

The worker may not use it to override:

- the active packet
- the identity model
- the active plan
- the active CT directory

## Stop Conditions

Stop immediately if any of these occur:

- the page contract differs from the packet
- the worker needs another page to complete the assignment
- auth or tenant behavior becomes unclear
- bootstrap endpoints block the page before the target endpoint can be tested
- the worker needs to import from `sdk/*.gen.ts`
- the worker starts designing new UX instead of matching Kestra behavior
- the worker is about to change files outside the packet scope without documenting the reason

## Required End-Of-Run Deliverables

At the end of the run, the worker must provide:

- updated `capture.md`
- updated `implement.md`
- runtime code changes
- tests or endpoint verification evidence
- updated `verify.md`
- a short blocker list if anything remains unresolved

No “done” claim is valid without the `verify.md` evidence.

## Recommended Launch Message

Use this as the worker handoff:

```text
Use kestra-ct as the only active control tower.
Implement exactly one page: flows_list.
Read the packet, baseline, adapter layout, verification matrix, and CT-generated type references first.
Use sequential thinking before capture or planning.
Fill capture.md with observed facts only.
Fill implement.md with exact runtime file targets and verification commands before coding.
Preserve the Kestra route and payload shape.
Keep namespace first-class.
Do not import backend types from sdk/*.gen.ts.
Stop on contract drift, bootstrap blockers, unclear auth or tenant behavior, or scope expansion.
Record proof in verify.md before making any success claim.
```
