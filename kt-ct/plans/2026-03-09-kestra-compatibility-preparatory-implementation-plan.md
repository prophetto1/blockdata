# Kestra Compatibility Preparatory Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after approval.

**Goal:** Prepare the repository, control-tower artifacts, typed interfaces, worker instructions, and execution order required to systematically connect Kestra UI pages to Kestra-compatible backend endpoints backed by Supabase `kt.*` tables.

**Architecture:** This effort is compatibility-first, not redesign-first. `web-kt` remains the reference UI, the Kestra `openapi.yml` remains the contract source, Supabase `kt.*` remains the storage layer, and a typed adapter backend maps `kt.*` rows into exact Kestra API response shapes. All preparatory artifacts are staged inside `kt-ct` first and are promoted into product paths only after review.

**Tech Stack:** `web-kt`, Supabase/Postgres `kt.*`, Supabase Edge Functions, generated Supabase DB types, generated OpenAPI API types, Kestra `openapi.yml`, worker instruction artifacts in the root control tower

---

## Governing Rules

We are doing compatibility-first Kestra alignment, not redesign. `web-kt` is the reference UI, `openapi.yml` is the contract source, and Supabase `kt.*` is the storage layer. Backend work must map typed `kt.*` rows into exact Kestra API DTOs. `namespace` is an alias of `project_id` and must never drift from it. No worker may implement a page before the control tower, reassessment, DB types, API contract types, worker instructions, and seeded task artifacts are in place. Work proceeds one page at a time, starting with `flows_list`, using the sequence: `capture -> plan -> implement -> verify`.

Additional staging rule:

- all preparatory outputs are saved into `kt-ct` first
- no generated file is written directly into product code paths during the preparatory phase
- promotion from `kt-ct` into product paths requires explicit review

## Situation Reassessment

The current repo now has the main ingredients required for Kestra compatibility work:

- `web-kt` contains a copied Kestra UI workspace
- `openapi.yml` exists at the repository root for generator compatibility
- Supabase contains the `kt.*` schema cloned from the Kestra SQL dump
- generated frontend API files exist under `web-kt/src/generated/kestra-api`
- worker-system templates already exist under `web-kt/docs/worker-system`

The missing layer is still the same:

- typed backend compatibility code that formats `kt.*` data into exact Kestra API payloads

The main risk is drift during setup:

- multiple workers invent different folder layouts
- different workers generate types into different locations
- workers mix observed facts with verified facts
- backend handlers hand-format JSON differently
- design work leaks into compatibility work

So the first approved execution phase must prepare a single shared operating system for the work before any page implementation begins.

## Scope of This Plan

This plan covers preparatory execution only.

In scope:

- reassess the current Kestra compatibility status once more from the repo
- create the root control-tower structure under `kt-ct`
- define canonical file locations for plans, prompts, instructions, tasks, and evidence
- generate typed Supabase database definitions for `kt`
- generate backend-facing Kestra OpenAPI types from the same `openapi.yml`
- define the page implementation workflow and worker prompt format
- define the first implementation slice and the approval gates for starting it

Out of scope:

- implementing any page endpoint
- wiring any specific page end to end
- redesigning any page
- changing route structures for final product UX
- broad parallel execution before the preparatory system is approved

## Required Preparatory Outcomes

Before any worker implements a page, these outcomes must exist:

1. A root control-tower structure with fixed paths.
2. A fresh reassessment document that reflects the current state of `web-kt`, `openapi.yml`, and `kt.*`.
3. A canonical staging location inside `kt-ct` for generated Supabase database types.
4. A canonical staging location inside `kt-ct` for generated backend Kestra API contract types.
5. A canonical worker instruction file and launch prompt.
6. Canonical task artifact templates for capture, plan, and verification.
7. A fixed page implementation sequence.
8. A fixed stop-condition list for workers.

## Canonical Directory Design

After approval, create these directories:

- `kt-ct/plans/`
- `kt-ct/assessments/`
- `kt-ct/instructions/`
- `kt-ct/prompts/`
- `kt-ct/tasks/`
- `kt-ct/evidence/`
- `kt-ct/generated/`
- `kt-ct/references/`

Purpose:

- `plans/` holds approved implementation plans
- `assessments/` holds reassessments and later reviews
- `instructions/` holds worker operating instructions
- `prompts/` holds launch prompts for workers and coordinators
- `tasks/` holds page-specific capture/plan/verify artifacts
- `evidence/` holds screenshots, logs, and command outputs if needed
- `generated/` holds CT-staged generated outputs before any promotion
- `references/` holds curated reference notes for this effort only

## Canonical Typed Interface Design

Two type systems must be generated and kept separate.

### 1. Database Types

Purpose:

- provide typed access to Supabase rows from `kt`
- remove ambiguity when querying `kt.flows`, `kt.executions`, `kt.logs`, and related tables

CT staging file:

- `kt-ct/generated/database.types.kt.ts`

Later promotion target:

- `supabase/functions/_shared/database.types.ts`

Target generation command:

```bash
npx supabase gen types typescript --project-id "$PROJECT_REF" --schema kt > kt-ct/generated/database.types.kt.ts
```

Local alternative:

```bash
npx supabase gen types typescript --local --schema kt > kt-ct/generated/database.types.kt.ts
```

### 2. Backend API Contract Types

Purpose:

- provide typed Kestra DTOs for backend mappers and handlers
- ensure backend formatters know the exact response shape they must return

CT staging directory:

- `kt-ct/generated/kestra-api/`

Later promotion target:

- `supabase/functions/_shared/kestra-api/`

Source:

- `openapi.yml` at the repo root

Requirement:

- use the same OpenAPI source used by `web-kt`
- do not define hand-written DTOs if generated types already cover the shape

## Canonical Mapping Rule

Every compatibility endpoint must follow this pattern:

- typed DB row or rows in
- mapper function
- typed Kestra DTO out

Never:

- query Supabase directly inside the page
- hand-build large JSON payloads in route handlers
- mix SQL and response formatting in the same function

Each domain gets its own mapper boundary:

- `flows`
- `executions`
- `logs`
- `triggers`
- `metrics`

## Worker Operating Model

Every worker must implement one page as a vertical slice.

Required sequence:

1. Trace the page.
2. Produce a capture artifact.
3. Produce a page plan.
4. Implement backend endpoint, query, and mapper.
5. Wire the page.
6. Verify and record evidence.

Every worker must use:

- `using-superpowers`
- sequential thinking
- `brainstorming`
- `writing-plans`
- `executing-plans`

No worker may skip the capture artifact or the plan artifact.

## First Implementation Sequence After Preparation

After the preparatory phase is approved and completed, page execution should start in this order:

1. `flows_list`
2. `flow_detail`
3. `executions_list`
4. `execution_detail`
5. `logs`

Reason:

- read-only and lower-risk pages first
- `kt.flows` unlocks the first vertical slice
- the page family establishes the mapper and endpoint pattern for later slices

## Approval Gates

This plan is the governing baseline for the remaining preparatory work.

Page implementation may begin only after all of the following are true:

- control-tower directories exist
- reassessment document exists
- CT-staged DB types are generated
- CT-staged backend API contract types are generated
- worker instructions exist in the root control tower
- canonical page task templates exist in the root control tower
- first page assignment is fixed

## Task Plan

### Task 1: Reassess Current State

**Files:**
- Create: `kt-ct/assessments/2026-03-09-kestra-compatibility-reassessment.md`
- Reference: `web-kt`, `openapi.yml`, `supabase/migrations/20260309193000_074_add_kt_kestra_schema.sql`

**Step 1: Re-check current assets**

Confirm:

- `web-kt` exists and has generated Kestra frontend client files
- `openapi.yml` exists at the repo root
- Supabase `kt.*` migration exists in the repo
- worker-system docs currently exist in `web-kt`

**Step 2: Record current readiness and current gaps**

Document what is already done and what is still missing.

### Task 2: Create the Control-Tower Structure

**Files:**
- Create: `kt-ct/assessments/.gitkeep`
- Create: `kt-ct/instructions/.gitkeep`
- Create: `kt-ct/prompts/.gitkeep`
- Create: `kt-ct/tasks/.gitkeep`
- Create: `kt-ct/evidence/.gitkeep`
- Create: `kt-ct/generated/.gitkeep`
- Create: `kt-ct/references/.gitkeep`

**Step 1: Create fixed directory layout**

Create the approved control-tower subdirectories.

**Step 2: Add a short root index if needed**

Keep the structure easy for workers to parse.

### Task 3: Generate Database Types

**Files:**
- Create/Modify: `kt-ct/generated/database.types.kt.ts`

**Step 1: Run the Supabase type generator for `kt` into `kt-ct`**

Use the canonical generation command.

**Step 2: Verify the generated file contains `kt` schema types**

Do not proceed if `kt` is missing.

**Step 3: Do not promote yet**

Review the staged file in `kt-ct` before any copy into product paths.

### Task 4: Generate Backend Kestra API Types

**Files:**
- Create: `kt-ct/generated/kestra-api/`

**Step 1: Choose and lock the generator**

Use the same OpenAPI source as `web-kt`.

**Step 2: Generate backend-facing Kestra API types**

Output them to the CT staging directory.

**Step 3: Verify presence of `Flows`, `Executions`, and `Logs` contract types**

**Step 4: Do not promote yet**

Review the staged output in `kt-ct` before any copy into product paths.

### Task 5: Move the Worker System into the Root Control Tower

**Files:**
- Create/Modify: `kt-ct/instructions/worker-system.md`
- Create/Modify: `kt-ct/prompts/worker-launch-prompt.md`
- Create/Modify: `kt-ct/tasks/page.capture.template.md`
- Create/Modify: `kt-ct/tasks/page.plan.template.md`
- Create/Modify: `kt-ct/tasks/page.verify.template.md`

**Step 1: Copy or adapt the current `web-kt` worker-system content**

Make the root control tower the primary source of truth.

**Step 2: Align wording to the typed-interface strategy**

Ensure workers know to use DB types plus API contract types.

### Task 6: Define the First Page Assignment

**Files:**
- Create: `kt-ct/tasks/flows_list.capture.md`
- Create: `kt-ct/tasks/flows_list.plan.md`
- Create: `kt-ct/tasks/flows_list.verify.md`

**Step 1: Pre-seed the first page artifact set**

Use `flows_list` as the first implementation slice.

**Step 2: Confirm fixed success criteria**

At minimum:

- page renders
- list loads
- search works
- pagination works
- response shape matches Kestra contract

### Task 7: Review and Approve the Preparatory Baseline

**Files:**
- Update: `kt-ct/assessments/2026-03-09-kestra-compatibility-reassessment.md`

**Step 1: Review all generated artifacts**

Check that the control tower, types, and worker materials exist.

**Step 2: Mark the system ready for page implementation**

Only then move to executing `flows_list`.

## Verification Expectations

Preparatory execution is complete only when:

- all planned directories exist
- reassessment exists
- `kt-ct/generated/database.types.kt.ts` exists and includes `kt`
- `kt-ct/generated/kestra-api/` exists and contains generated contract types
- worker instruction and prompt files exist in `kt-ct`
- `flows_list` task templates are seeded

## Stop Conditions

Stop and ask for review if:

- `kt` types do not generate cleanly
- backend OpenAPI generation produces unusable output for the backend runtime
- `web-kt` and backend type generation diverge from the same `openapi.yml`
- root control-tower structure starts duplicating multiple conflicting sources of truth
- any worker writes generated preparatory artifacts directly into product paths before CT review
- the effort drifts into page implementation before preparatory approval

## Current Resume Point

On resume, continue from the CT-first baseline in this order:

- review the current reassessment against the live CT state
- review the staged DB types in `kt-ct/generated/database.types.kt.ts`
- generate backend API contract types into `kt-ct/generated/kestra-api/`

Nothing else should be promoted into product paths before those staged artifacts are reviewed.
