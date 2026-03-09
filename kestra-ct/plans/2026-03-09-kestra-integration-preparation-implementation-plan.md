# Kestra Integration Preparation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare the repo, control workspace, worker system, contract artifacts, and verification process for a page-by-page Kestra UI integration without starting broad execution yet.

**Architecture:** The integration will use `web-kt` as the Kestra UI workspace, a Kestra-compatible adapter layer in Supabase edge functions, and `kt.*` as the backing schema. Preparation work freezes the process first: documentation flow, worker packets, generated types, adapter layout, and verification gates. Only after this plan is approved do we execute the preparatory steps and then start the first page slice.

**Tech Stack:** Vue/Vite (`web-kt`), Deno Supabase Edge Functions, Supabase Postgres `kt` schema, generated OpenAPI client/types from `openapi.yml`, generated Supabase database types, Markdown with YAML frontmatter for worker artifacts.

## Alignment Directive

We are doing compatibility-first Kestra alignment, not redesign. `web-kt` is the reference UI, `openapi.yml` is the contract source, and Supabase `kt.*` is the storage layer. Backend work must map typed `kt.*` rows into exact Kestra API DTOs. `kt.*` remains Kestra-native: `namespace` is first-class, and workers must not introduce `project_id` into the `kt` contract, page packets, adapter DTOs, or endpoint semantics. If a Blockdata-specific crosswalk is needed later, it must live outside the `kt.*` compatibility surface. No worker may implement a page before the control tower, reassessment, DB types, API contract types, worker instructions, and seeded task artifacts are in place. Work proceeds one page at a time, starting with `flows_list`, using the sequence: `capture -> plan -> implement -> verify`.

## Current State Snapshot

Already true on **March 9, 2026**:
- [web-kt](web-kt) exists as a copied Kestra UI workspace.
- [openapi.yml](openapi.yml) exists at repo root where `web-kt` expects `../openapi.yml`.
- `npm install` and `npm run generate:openapi` already worked in [web-kt](web-kt), and generated SDK files exist under [src/generated/kestra-api](web-kt/src/generated/kestra-api).
- Live Supabase already has the `kt` schema with the 21-table Kestra surface.
- The local repo still stops at [20260308150000_072_registry_superuser_profiles.sql](supabase/migrations/20260308150000_072_registry_superuser_profiles.sql), so repo-to-database drift must be documented and reconciled before broad execution starts.

## Execution Rules For This Plan

- This plan is **preparation only**.
- All preparatory artifacts are initially saved inside `kestra-ct/` only.
- Do not write generated reference files into `supabase/functions/`, `web-kt/`, or other runtime directories during this phase.
- Do not begin broad page wiring while executing this plan.
- Do not redesign UI during this phase.
- Do not let workers invent their own process.
- The first functional slice after preparation is still `Flows list`.

### Task 1: Create The CT Operating Structure

**Files:**
- Create: `kestra-ct/_templates/.gitkeep`
- Create: `kestra-ct/generated/.gitkeep`
- Create: `kestra-ct/pages/.gitkeep`
- Create: `kestra-ct/readiness/.gitkeep`
- Create: `kestra-ct/decisions.md`
- Create: `kestra-ct/page-registry.yaml`
- Create: `kestra-ct/verification-matrix.md`

**Purpose**

Create the persistent control surface that page workers will use.

**Steps**

1. Create the `_templates/`, `pages/`, and `readiness/` directories.
2. Create `decisions.md` to log deliberate deviations, shims, and unresolved product/contract choices.
3. Create `page-registry.yaml` with one entry per candidate page or route.
4. Create `verification-matrix.md` with the commands and evidence expectations for:
   - `web-kt` install
   - `generate:openapi`
   - page run
   - adapter endpoint verification
   - page-level test runs

**Verification**

List the created files and confirm the registry and matrix exist with initial structure.

### Task 2: Reconcile Repo-To-Live Supabase Drift Before Type Generation

**Files:**
- Create: `kestra-ct/readiness/2026-03-09-supabase-schema-drift.md`
- Modify: `kestra-ct/decisions.md`

**Purpose**

Freeze the exact gap between the live Supabase project and the local migration tree before any generated types or adapter files depend on that state.

**Steps**

1. Compare the live Supabase migration list to the local `supabase/migrations/` directory.
2. Record the exact missing Kestra migration surface:
   - live `kt` schema exists
   - live migration history includes the Kestra schema add
   - local repo does not yet contain the matching migration artifact
3. Decide and document the reconciliation rule:
   - no generated shared types may be treated as canonical until repo migration parity is restored
4. Record the required next action for parity:
   - backfill the missing migration into the repo before broader implementation starts

**Verification**

Include the exact migration evidence used for the comparison in the drift doc.

### Task 3: Decide The HTTP Compatibility Surface

**Files:**
- Create: `kestra-ct/readiness/2026-03-09-http-compatibility-surface.md`
- Modify: `kestra-ct/decisions.md`

**Purpose**

Choose the transport shape that will let `web-kt` call a Kestra-style `/api/v1/main/...` backend while implementation is actually backed by Supabase functions.

**Steps**

1. Trace the current `web-kt` API base behavior:
   - frontend base URL construction
   - `/api/v1/main` expectation
   - first-page endpoint shape for `Flows list`
2. Compare the available backend surface:
   - current Supabase `/functions/v1/...` endpoints
   - any existing proxy or rewrite layer in the repo
3. Choose and document one compatibility strategy:
   - proxy
   - rewrite layer
   - dedicated backend gateway
   - or another explicit choice
4. Record the first required mapped route for `Flows list`.

**Verification**

The decision doc must name the chosen strategy and the exact first route shape to implement.

### Task 4: Reconfirm The Baseline Before Execution

**Files:**
- Create: `kestra-ct/readiness/2026-03-09-baseline-readiness.md`

**Purpose**

Capture the exact starting state so later workers do not rely on stale chat context.

**Steps**

1. Record the current root artifacts:
   - `web-kt`
   - `openapi.yml`
   - `kestra.plugins`
   - live `kt` schema presence
2. Record the known repo drift:
   - live `kt` schema exists
   - local `supabase/migrations/` does not yet contain the matching migration file
3. Record whether `web-kt` remains bootable:
   - dependency install status
   - generated client status
4. Record unresolved baseline risks:
   - auth/runtime assumptions in Kestra UI
   - upstream route/plugin/global store assumptions
   - local migration drift
   - HTTP compatibility dependency

**Verification**

Run the exact baseline inspection commands again and include results in the readiness doc.

### Task 5: Create The Worker Document Templates

**Files:**
- Create: `kestra-ct/_templates/packet.md`
- Create: `kestra-ct/_templates/capture.md`
- Create: `kestra-ct/_templates/implement.md`
- Create: `kestra-ct/_templates/verify.md`
- Create: `kestra-ct/worker-instructions.md`

**Purpose**

Freeze the artifact chain so every worker performs the same sequence:
`packet -> capture -> implement -> verify`.

**Steps**

1. Create `worker-instructions.md` with:
   - required skill invocation order
   - stop conditions
   - scope rules
   - verification rules
   - no-redesign rule
2. Create `packet.md` template for page assignment.
3. Create `capture.md` template for traced facts only.
4. Create `implement.md` template for intended code changes only.
5. Create `verify.md` template for proven results only.

**Verification**

Check that each template contains YAML frontmatter and the fixed sections needed by AI workers.

### Task 6: Generate And Freeze The Shared Type Layers In CT

**Files:**
- Create: `kestra-ct/generated/database.types.ts`
- Create: `kestra-ct/generated/kestra-contract/README.md`
- Create: `kestra-ct/generated/kestra-contract/` generated contract files
- Modify: `kestra-ct/verification-matrix.md`
- Modify: `kestra-ct/decisions.md`

**Purpose**

Separate database row typing from Kestra contract typing before adapter work begins, while keeping preparation outputs inside the control tower.

**Steps**

1. Generate Supabase TypeScript types for `kt`:
   - use `--schema kt`
   - expand to `public,kt` only if the adapter later proves it needs both
2. Place the generated database types in `kestra-ct/generated/database.types.ts`.
3. Generate backend-facing Kestra contract types from the same [openapi.yml](openapi.yml).
4. Place those contract artifacts in `kestra-ct/generated/kestra-contract/`.
5. Record:
   - generation commands
   - source of truth
   - refresh policy
   - later promotion target in the runtime repo after preparation approval

**Verification**

Run both generators successfully and document the output locations and exit status.

### Task 7: Define The Adapter Code Layout Before Page Work

**Files:**
- Create: `kestra-ct/adapter-layout.md`
- Create: `kestra-ct/adapter-readme.md`

**Purpose**

Freeze where handlers, queries, and mappers will live so workers do not scatter logic.

**Steps**

1. Define the handler layout:
   - page/domain endpoint entrypoints
   - shared query modules
   - shared mappers
2. Define the rule that DB types and OpenAPI types meet only in mapper modules.
3. Define naming conventions for:
   - handler files
   - query files
   - mapper files
   - tests
4. Decide and document whether the first domain endpoint lives as:
   - `supabase/functions/kestra-flows/index.ts`
   - or another explicitly chosen domain path
5. Keep this as a CT-side design artifact only; do not create runtime adapter files yet.

**Verification**

The layout doc must name the chosen directories and file patterns explicitly.

### Task 8: Prepare The web-kt Runtime Baseline

**Files:**
- Create: `kestra-ct/web-kt-baseline.md`
- Modify: `kestra-ct/verification-matrix.md`

**Purpose**

Record the exact runtime assumptions in `web-kt` before page workers start touching it.

**Steps**

1. Record:
   - boot command
   - generated client command
   - relevant env/runtime assumptions
   - route table location
   - store locations
2. Identify the minimal evidence required to say a page is truly wired:
   - page loads
   - data renders
   - search/sort/pagination or equivalent behavior works
3. Record any upstream global assumptions that might block page-by-page progress:
   - auth
   - router guards
   - global config/plugins

**Verification**

Run the baseline commands and record the exact commands and results.

### Task 9: Create The Golden Page Packet For Flows List

**Files:**
- Create: `kestra-ct/pages/flows-list/packet.md`
- Create: `kestra-ct/pages/flows-list/capture.md`
- Create: `kestra-ct/pages/flows-list/implement.md`
- Create: `kestra-ct/pages/flows-list/verify.md`
- Modify: `kestra-ct/page-registry.yaml`

**Purpose**

Prepare the first page slice without implementing it yet.

**Steps**

1. Register `Flows list` in `page-registry.yaml`.
2. Create a `packet.md` for the page with:
   - route
   - source component
   - source store method
   - upstream endpoint
   - candidate `kt` table
   - files in scope
   - out-of-scope actions
3. Create empty `capture.md`, `implement.md`, and `verify.md` from the templates.
4. Mark `Flows list` as the golden path page.

**Verification**

Confirm the page packet exists and the registry points to it.

### Task 10: Approval Gate Before Any Preparatory Execution Continues

**Files:**
- Modify: `kestra-ct/plans/2026-03-09-kestra-integration-preparation-implementation-plan.md`

**Purpose**

Force a clean stop between planning and execution.

**Steps**

1. Re-read the plan for gaps.
2. Confirm whether any path or naming decisions need human correction.
3. Do not move into execution batches until this document is explicitly approved.

**Verification**

Approval is explicit human approval of this document.

## Definition Of Done For This Plan

This plan is complete when:
- the CT root exists
- the repo-to-live schema drift is documented with a reconciliation rule
- the HTTP compatibility path is explicitly chosen
- the readiness snapshot is current
- all preparatory artifacts created so far still live under `kestra-ct/`
- the preparation plan is approved

Only after approval do we execute the preparatory tasks in order.

## Preparation Execution Status

Status checked on `2026-03-09`.

- Task 1, CT operating structure: `Complete`
- Task 2, repo-to-live schema drift reconciliation: `Complete`
- Task 3, HTTP compatibility surface decision: `Complete`
- Task 4, baseline readiness snapshot: `Complete`
- Task 5, worker document templates: `Complete`
- Task 6, CT-local shared type layers: `Complete`
- Task 7, adapter layout docs: `Complete`
- Task 8, `web-kt` runtime baseline: `Complete`
- Task 9, flows-list page packet: `Complete`
- Task 10, approval gate close-out: `Complete`

## Approval Gate Outcome

The preparation phase is now closed cleanly.

- No further preparatory artifacts are required before the first page slice.
- The CT contains the readiness docs, worker templates, generated reference artifacts, adapter layout, runtime baseline, and the seeded `flows_list` packet.
- The next phase starts with the `flows_list` packet only.

Remaining constraints:

- CT-generated reference artifacts are still staging artifacts until repo migration parity is restored.
- Runtime promotion into `supabase/functions/_shared/` remains blocked until that parity work is accepted.
- `Flows list` has one declared follow-on dependency after `GET /api/v1/main/flows/search`: `POST /api/v1/main/executions/latest`.
