# Worker Execution Loop

This file is the per-page execution procedure.

[worker-instructions.md](./worker-instructions.md) remains the base policy file. If this file and the base policy differ, follow the base policy for invariants and this file for page-by-page execution order.

## What You Are Building

You are building a compatibility adapter that makes a copied Kestra UI (`web-kt/`) work against a Supabase backend (`kt.*` schema) instead of a real Kestra server.

The system has three parts:

```text
web-kt/                            Kestra's Vue frontend (copied, mostly untouched)
    ↓ sends requests like
    GET /api/v1/main/flows/search
    ↓ hits a compatibility proxy or gateway
    ↓ forwarded to
supabase/functions/kestra-flows/   Supabase edge function (you build this)
    ↓ queries
    kt.flows                       Postgres table in the kt schema
    ↓ maps rows into Kestra-shaped JSON
    ↓ returns to web-kt
```

You are not redesigning anything. You are making `web-kt` think it is talking to a real Kestra backend.

## Where Things Live

```text
kestra-ct/                         Control tower (process docs, not runtime code)
  onboarding/                      Worker instructions and references
  pages/flows-list/                First page: packet, capture, implement, verify
  generated/database.types.ts      kt.* row types (staging, from live schema)
  generated/kestra-contract/       Kestra API response types (from openapi.yml)
  page-registry.yaml               Master page backlog and status tracker
  decisions.md                     Architectural decisions that override defaults

web-kt/                            Kestra Vue frontend workspace
  src/components/flows/Flows.vue   The flows list page
  src/stores/flow.ts               Store that calls GET /api/v1/main/flows/search
  src/routes/routes.js             Route table

supabase/functions/                Runtime edge functions
  flows/                           Existing Blockdata flow function (not yours)
  kestra-flows/                    Your adapter function
  _shared/kestra-adapter/          Your shared query/mapper/filter modules
  _shared/kestra-contract/         Later promotion target for contract types
```

Important:

- `supabase/functions/flows/` already exists for the Blockdata flow system.
- Your Kestra compatibility work goes in `supabase/functions/kestra-flows/`.
- Do not modify the existing `supabase/functions/flows/` function as part of Kestra page execution.

## The Adapter Pattern

Every page adapter follows the same layered pattern:

```text
Handler (index.ts)      parses HTTP, calls query + mapper, returns response
  ↓
Filter (filters/X.ts)   normalizes query string into typed filter object
  ↓
Query (queries/X.ts)    reads kt.* rows using DB types, returns typed rows
  ↓
Mapper (mappers/X.ts)   converts DB rows into Kestra API DTOs
```

DB types and Kestra contract types meet only in mapper modules.

- queries never import Kestra DTOs
- handlers never inline SQL
- handlers never build large response shapes directly

See [adapter-layout.md](./adapter-layout.md).

## Identity Rule

`kt.*` is Kestra-native.

- `namespace` is first-class
- do not introduce `project_id` into `kt.*` adapter code
- do not introduce `project_id` into Kestra DTOs
- do not introduce `project_id` into endpoint semantics

If a Blockdata crosswalk is needed, it lives outside the `kt.*` compatibility surface.

See [../decisions.md](../decisions.md).

## Before You Start A Page

1. Read [../page-registry.yaml](../page-registry.yaml).
2. Pick the next page by priority.
3. Claim the page for your side before doing any page work.
4. Read the page packet. That is your scope lock.
5. Read these onboarding docs in order:
   - [worker-instructions.md](./worker-instructions.md)
   - [adapter-layout.md](./adapter-layout.md)
   - [web-kt-baseline.md](./web-kt-baseline.md)
   - [verification-matrix.md](./verification-matrix.md)
   - [status-model.md](./status-model.md)
6. Skim the type references:
   - [../generated/database.types.ts](../generated/database.types.ts)
   - [../generated/kestra-contract/types.gen.ts](../generated/kestra-contract/types.gen.ts)

Right now, the first page is `flows_list`.

### Claim Rule

Before capture:

- Windows workers update `windows_status`
- Ubuntu workers update `ubuntu_status`
- page workers do not update `ct_status` unless they are explicitly revising the shared packet lifecycle

Set your side status to `capturing` when you claim the page.

If your side already shows `capturing`, `planning`, `implementing`, or `verifying` for that page, stop and reconcile before continuing.

If the registry does not yet track a per-side owner field, assume one worker per side at a time for a given page.

## The Page Loop

For each page, produce four documents in order:

1. packet
2. capture
3. implement
4. verify

Do not skip a document.

### Step 1: Capture

Read the frontend and contract files named in the packet. Fill the page's `capture.md` with observed facts only.

Record:

- actual route
- actual component
- actual store method
- actual request method and path
- actual query params
- actual top-level response shape
- actual list field or detail fields
- actual UI-to-response mapping candidates
- actual candidate `kt.*` tables and columns

Do not put guesses, fixes, or intentions into `capture.md`.

If you cannot determine the response shape from code and `openapi.yml`, stop and escalate.

### Step 2: Implementation Plan

Expand the page's `implement.md` into a real execution plan with exact runtime targets.

The plan must name:

- handler path
- filter path, if needed
- query path
- mapper path
- test file paths
- frontend file paths to touch, if any
- verification commands

If you cannot name exact file targets, the plan is not ready.

### Step 3: Check Shared Blockers

Before writing code, check whether the page can actually boot and whether the compatibility path exists.

Known shared prerequisites:

- `/api/v1/configs`
- `/api/v1/basicAuthValidationErrors`
- `/api/v1/plugins/...`
- `/oauth/access_token` when auth refresh flows are exercised
- compatibility gateway or proxy serving `/api/v1/main/...`

If a shared prerequisite is missing:

- do not invent a page-local workaround
- mark the page `blocked`
- record the blocker in `implement.md` or `verify.md`

### Step 4: Build

Use TDD order:

1. write a failing test for the smallest page-critical behavior
2. implement the filter layer if needed
3. implement the query layer
4. implement the mapper layer
5. implement the route handler
6. wire the frontend only if necessary

This step requires the `test-driven-development` skill. Do not skip it just because the page already has a packet and plan.

For early slices, use the CT-staged type files directly:

- `kestra-ct/generated/database.types.ts`
- `kestra-ct/generated/kestra-contract/types.gen.ts`

Do not invent a type-promotion step during normal page work. Promotion into `supabase/functions/_shared/` is a later hardening task.

### Step 5: Verify

Run exact commands and record the results in `verify.md`.

Minimum proof for a page to be done:

- [ ] dev server starts
- [ ] page route loads
- [ ] target endpoint returns the expected Kestra-compatible shape
- [ ] rows or page data render
- [ ] page-critical interaction works

For `flows_list`, that means:

- [ ] `/ui/main/flows` loads
- [ ] `GET /api/v1/main/flows/search` returns the expected shape
- [ ] rows render
- [ ] search works
- [ ] sort or pagination works if exposed

No "done" claim without `verify.md` evidence.

### Step 6: Update The Registry

Update [../page-registry.yaml](../page-registry.yaml).

Set:

- your side status only:
  - Windows workers update `windows_status`
  - Ubuntu workers update `ubuntu_status`
- `ct_status` only if the shared packet state truly changed

See [status-model.md](./status-model.md).

Do not write `done`, `blocked`, or `partial` into `ct_status` unless you are intentionally updating the shared packet lifecycle rather than your environment execution result.

## Status Meanings

Use the status definitions in [status-model.md](./status-model.md).

Important:

- `ct_status` tracks shared packet lifecycle
- `ubuntu_status` tracks Ubuntu execution state
- `windows_status` tracks Windows execution state
- `packet_seeded` means the shared packet exists and page execution may begin with capture
- it does not mean implementation exists
- it does not mean verification exists
- it does not mean shared prerequisites are already present

## Skill Order

Use these in order:

1. `using-superpowers`
2. sequential thinking before capture or planning
3. `brainstorming` only if the packet or contract is ambiguous
4. `test-driven-development` before runtime implementation
5. `writing-plans` before runtime implementation
6. `executing-plans` during implementation
7. `verification-before-completion` before any success claim

If a sequential-thinking tool is unavailable, write this minimum breakdown before capture:

1. route
2. request method and path
3. response envelope
4. target backend files
5. shared blockers
6. verification commands

## Stop Conditions

Stop immediately and escalate if:

- the page contract differs from the packet
- you need another page to complete the assignment
- auth or tenant behavior is unclear
- bootstrap endpoints block the page before your endpoint is tested
- the compatibility gateway is missing and the page cannot reach the adapter
- you need to import from `sdk/*.gen.ts`
- you are designing new UX instead of matching Kestra behavior
- you are about to change files outside the packet scope

## Hard Rules

- one page at a time
- `kestra-ct/` is the only active control tower
- do not import backend DTO types from `sdk/*.gen.ts`
- do not introduce `project_id` into the `kt.*` surface
- do not claim success without fresh verification evidence
- use repo-relative paths in notes
- put durable facts in CT files, not chat

## Reference Index

| Document | Purpose |
| --- | --- |
| [page-investigation-procedure.md](./page-investigation-procedure.md) | step-by-step packet + capture procedure |
| [page-implementation-procedure.md](./page-implementation-procedure.md) | step-by-step implementation procedure |
| [worker-instructions.md](./worker-instructions.md) | base policy rules |
| [adapter-layout.md](./adapter-layout.md) | runtime file placement and naming |
| [adapter-readme.md](./adapter-readme.md) | short adapter guide |
| [web-kt-baseline.md](./web-kt-baseline.md) | frontend runtime assumptions and bootstrap dependencies |
| [verification-matrix.md](./verification-matrix.md) | commands and evidence expectations |
| [status-model.md](./status-model.md) | status definitions and transitions |
| [../decisions.md](../decisions.md) | architectural decisions |
| [../page-registry.yaml](../page-registry.yaml) | page backlog and status |
| [../generated/database.types.ts](../generated/database.types.ts) | `kt` schema row types |
| [../generated/kestra-contract/types.gen.ts](../generated/kestra-contract/types.gen.ts) | Kestra API contract types |
| [../plans/2026-03-09-kestra-integration-preparation-implementation-plan.md](../plans/2026-03-09-kestra-integration-preparation-implementation-plan.md) | preparation plan |
| [../assessments/2026-03-09-kestra-integration-preparation-gate-assessment.md](../assessments/2026-03-09-kestra-integration-preparation-gate-assessment.md) | preparation gate review |
