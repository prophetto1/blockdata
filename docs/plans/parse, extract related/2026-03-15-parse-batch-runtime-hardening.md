# Parse Batch Runtime Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the fragile browser-driven Parse All flow with a durable server-side batch queue that reliably submits, tracks, retries, and displays parse work for many files.

**Architecture:** Keep Docling conversion as the external execution runtime, but move multi-file parse submission to a server-owned queue. Refactor the heavy parts of `trigger-parse` into a shared dispatch module, add `parse_batches` plus `parse_batch_items`, process items through a claim RPC + worker pattern modeled on the existing overlay worker, and make the UI observe durable batch/item state with realtime plus polling fallback.

**Tech Stack:** Supabase Postgres, Supabase Edge Functions, Realtime, existing `admin_runtime_policy`, React, TypeScript, Docling conversion service.

---

## Problem Summary

Users hit the parse feature immediately, and the current behavior is not operationally strong enough for batch use:

- `Parse All` and `Parse Selected` are driven by `useBatchParse.ts`, which only keeps an in-memory browser queue and gives each file one dispatch attempt.
- `trigger-parse` is doing too much work to serve as the per-file browser submission boundary: cleanup, storage URL generation, status mutation, callback preparation, and live conversion-service dispatch.
- `Parse Selected` currently includes selected rows regardless of whether they are parseable, so mixed selections can create avoidable failures.
- The page relies on `source_documents` realtime updates, but there is no durable batch progress model and no polling/reconciliation fallback if updates are missed.
- Operational knobs are split across hardcoded UI behavior, env vars, and admin runtime policy instead of being centrally controlled.

This plan treats concurrency, retries, queueing, and runtime state as one problem and fixes them together.

## Success Criteria

- Selecting 10, 30, or 50 parseable files creates one durable batch submission and returns immediately.
- Closing or refreshing the browser does not lose queued parse work.
- The system tracks each document through `queued`, `dispatching`, `converting`, `parsed`, `failed`, and `retrying` without relying on local component memory.
- Transient dispatch failures retry automatically server-side up to policy limits.
- Parse page state updates automatically from durable batch/item records, with polling fallback if realtime is missed.
- `Parse Selected` filters to parseable rows and explains skipped rows.
- Parse concurrency, retry count, retry backoff, batch claim size, and poll interval live in the existing superuser runtime policy surface.

## Scope

### In Scope

- Durable parse batch tables and claim RPC
- Server-side parse batch submit endpoint
- Server-side parse dispatch worker
- Refactor of `trigger-parse` into shared dispatch logic reusable by worker and single-file entrypoint
- Parse batch status UI and fallback refresh behavior
- Parse runtime controls in `admin_runtime_policy` plus settings UI
- Immediate UX guardrails for `Parse Selected`

### Out of Scope

- Replacing the external Docling conversion service
- Full conversion-service retry semantics after callback handoff
- New OCR/VLM profile capability work beyond using current readiness signals
- Canceling already-started conversion jobs inside the external conversion runtime

## Design Decisions

### 1. Server owns parse queue state

Do not keep multi-file parse orchestration in browser memory. The browser should submit a batch and observe it, not drive per-file dispatch attempts.

### 2. Reuse the existing queue pattern already in the repo

Follow the overlay worker model:

- durable items table
- atomic claim RPC using `FOR UPDATE SKIP LOCKED`
- service-role-only worker claims
- attempt counts and terminal failure state
- runtime policy controls for batch size and retries

### 3. Keep `trigger-parse` for single-file compatibility

Do not delete the existing function. Refactor its heavy logic into a shared module so:

- single-file parse still works from row actions
- batch worker can call the same code directly
- there is only one parse dispatch implementation to maintain

### 4. Runtime state needs both realtime and reconciliation

Realtime alone is not sufficient for this user-facing flow. The parse page should subscribe to durable batch/item changes and also perform poll/reconcile on focus and at a modest interval while active work exists.

### 5. Admin policy is the right home for operational knobs

The repo already has `admin-config` plus worker/runtime panels. Parse dispatch controls should be added there instead of staying hardcoded in the UI.

## Data Model

### `parse_batches`

One row per user-initiated multi-file parse submission.

Required columns:

- `batch_id uuid primary key default gen_random_uuid()`
- `owner_id uuid not null references auth.users(id)`
- `project_id uuid null references public.projects(project_id)`
- `profile_id uuid null references public.parsing_profiles(id)`
- `requested_pipeline_config jsonb not null default '{}'::jsonb`
- `status text not null check (status in ('queued','running','complete','failed','cancelled'))`
- `total_items integer not null default 0`
- `queued_items integer not null default 0`
- `running_items integer not null default 0`
- `succeeded_items integer not null default 0`
- `failed_items integer not null default 0`
- `cancel_requested boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `completed_at timestamptz null`
- `last_error text null`

### `parse_batch_items`

One row per source document inside a submitted batch.

Required columns:

- `item_id uuid primary key default gen_random_uuid()`
- `batch_id uuid not null references public.parse_batches(batch_id) on delete cascade`
- `owner_id uuid not null references auth.users(id)`
- `project_id uuid null references public.projects(project_id)`
- `source_uid uuid not null references public.source_documents(source_uid) on delete cascade`
- `profile_id uuid null references public.parsing_profiles(id)`
- `requested_pipeline_config jsonb not null default '{}'::jsonb`
- `status text not null check (status in ('queued','claimed','dispatching','converting','retrying','parsed','failed','cancelled'))`
- `attempt_count integer not null default 0`
- `max_attempts integer not null default 3`
- `claimed_by text null`
- `claimed_at timestamptz null`
- `next_retry_at timestamptz null`
- `last_error text null`
- `dispatch_started_at timestamptz null`
- `dispatch_completed_at timestamptz null`
- `source_status_snapshot text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints and indexes:

- unique `(batch_id, source_uid)`
- index on `(status, next_retry_at, created_at)`
- index on `(owner_id, created_at desc)`
- index on `(source_uid)`

### Realtime publication

Publish:

- `parse_batches`
- `parse_batch_items`

Keep RLS enabled on both. User clients should be allowed to read only their own rows. Worker claims stay service-role-only.

## Runtime Policy Additions

Extend `RuntimePolicy` in `supabase/functions/_shared/admin_policy.ts` with a new `parse` section:

- `parse.dispatch_concurrency_default`
- `parse.dispatch_concurrency_max`
- `parse.max_retries`
- `parse.claim_batch_size.default`
- `parse.claim_batch_size.min`
- `parse.claim_batch_size.max`
- `parse.retry_backoff_ms`
- `parse.retry_backoff_max_ms`
- `parse.poll_interval_ms`
- `parse.reconcile_on_focus`
- `parse.batch_submit_limit`
- `parse.conversion_ack_timeout_ms`

Keep existing `upload.max_files_per_batch`; do not duplicate it. The parse page should honor both:

- upload-time selection limit from `upload.max_files_per_batch`
- runtime parse dispatch behavior from `parse.*`

## Function and UI Contract Changes

### New endpoint: `parse-batch-submit`

Request body:

```json
{
  "source_uids": ["uuid-1", "uuid-2"],
  "profile_id": "uuid-or-null",
  "pipeline_config": {}
}
```

Response:

```json
{
  "ok": true,
  "batch_id": "uuid",
  "accepted_count": 2,
  "skipped": [
    { "source_uid": "uuid-x", "reason": "not_parseable_status" }
  ]
}
```

Rules:

- validate ownership and project consistency
- only accept docs in `uploaded`, `conversion_failed`, or `parse_failed`
- insert one batch row and N item rows
- return `202 Accepted`
- do not call the conversion service inline

### New endpoint: `parse-worker`

Responsibilities:

- claim ready items through RPC
- load runtime policy
- call shared parse dispatch helper for each claimed item
- update item status to `converting`, `parsed`, `retrying`, or `failed`
- update batch counters and terminal status

### Existing endpoint: `trigger-parse`

Keep for single-file/manual row actions, but refactor to use shared dispatch logic. It should continue validating one file and then:

- either submit a single-item batch, or
- call the shared dispatch helper directly if we intentionally preserve the legacy single-item path

Recommendation: move it to the same durable queue path for consistency. Single-file parse should just be a batch of one.

## Shared Dispatch Module

Create a shared module, for example:

- `supabase/functions/_shared/parse_dispatch.ts`

Responsibilities:

- validate source document ownership and parseable status
- load runtime policy and resolve effective config
- clean stale parse artifacts / rows safely
- create signed URLs
- write `source_documents.status = 'converting'`
- pre-insert `conversion_parsing`
- call the external conversion service
- classify response into:
  - `accepted`
  - `ack_timeout`
  - `terminal_failure`
  - `retryable_failure`

Return a typed result object so both `trigger-parse` and `parse-worker` can make correct item-state transitions.

## UI Behavior

### Parse page

Replace `useBatchParse` as the primary multi-file mechanism with a durable batch hook:

- `useParseBatchSubmit`
- `useParseBatchStatus`

Behavior:

- `Parse All` submits all parseable docs
- `Parse Selected` submits only parseable selected docs
- if selected rows include non-parseable items, show a summary like:
  - `7 submitted`
  - `3 skipped (already parsed or converting)`

### Live progress

Add a batch progress rail or panel showing:

- active batch id
- total / queued / running / parsed / failed counts
- current profile
- last error summary if any

Subscribe to:

- `parse_batches`
- `parse_batch_items`
- existing `source_documents`

Add fallback reconciliation:

- poll active batch every `parse.poll_interval_ms` while any item is non-terminal
- refresh on window focus if `parse.reconcile_on_focus` is true
- force one final refresh when batch becomes terminal

### Immediate UX fixes

Implement these before the queue rollout is complete:

- filter `Parse Selected` to parseable rows, not all selected rows
- show skipped-count messaging
- disable multi-file parse when no parseable rows are selected

## Rollout Strategy

1. Land durable queue schema and policy keys first.
2. Land shared dispatch refactor with no behavior change for single-file parse.
3. Add `parse-batch-submit` and `parse-worker`.
4. Switch Parse All / Parse Selected to durable batch mode.
5. Keep row-level single parse available, preferably through the same batch-of-one flow.
6. Remove or deprecate the old in-memory `useBatchParse` orchestration once the new path is stable.

## Rollback Strategy

- If worker path is unstable, leave tables in place but route UI back to single-file/manual parse only.
- Because `trigger-parse` is retained during rollout, the system can temporarily fall back to direct single-file dispatch while multi-file batch submit is disabled.
- Do not remove existing parse tables or Docling callback flow in this phase.

## Acceptance Criteria

- Batch submission of 10 parseable docs succeeds without browser-memory orchestration.
- Refreshing the page during an active batch preserves progress display.
- If realtime updates are missed, polling reconciles state without manual full-page reload.
- A mixed `Parse Selected` action never attempts to parse already-`parsed` or already-`converting` docs.
- Retryable conversion-dispatch failures are retried server-side and visible in item status.
- Terminal failures are visible per item with `last_error`.
- All parse knobs appear in the superuser settings surface and persist through `admin-config`.

### Task 1: Add Parse Queue Policy Keys

**Files:**
- Modify: `supabase/functions/_shared/admin_policy.ts`
- Modify: `supabase/functions/admin-config/index.ts`
- Modify: `web/src/pages/settings/WorkerConfigPanel.tsx`
- Create: `web/src/pages/settings/ParseQueueConfigPanel.tsx`
- Modify: settings tab/index file that mounts runtime config panels
- Test: `supabase/functions/_shared/admin_policy.test.ts` or nearest existing policy tests

**Step 1: Write failing policy tests**

Add tests for:

- loading default `parse.*` values
- applying valid `parse.*` updates
- rejecting invalid ranges such as negative retry counts

**Step 2: Run policy tests to verify failure**

Run:

```bash
deno test supabase/functions/_shared/admin_policy.test.ts
```

Expected: FAIL because `parse.*` keys are unknown.

**Step 3: Add the `parse` section to `RuntimePolicy`**

Implement:

- default values
- `applyPolicyValue()` support
- `validateRuntimePolicy()` range checks
- snapshot support

**Step 4: Expose settings in the superuser UI**

Add a parse runtime settings panel with fields for:

- retries
- backoff
- claim size
- poll interval
- default dispatch concurrency
- max dispatch concurrency

Reuse `admin-config` GET/PUT flow.

**Step 5: Run verification**

Run:

```bash
deno test supabase/functions/_shared/admin_policy.test.ts
cd web && npx tsc --noEmit
```

Expected: PASS

**Step 6: Commit**

```bash
git add supabase/functions/_shared/admin_policy.ts supabase/functions/admin-config/index.ts web/src/pages/settings/ParseQueueConfigPanel.tsx web/src/pages/settings/WorkerConfigPanel.tsx
git commit -m "feat: add parse runtime policy controls"
```

### Task 2: Add Durable Parse Batch Tables and Claim RPC

**Files:**
- Create: `supabase/migrations/20260315170000_092_parse_batch_queue.sql`
- Test: SQL apply verification via local/remote migration path

**Step 1: Write the migration**

Include:

- `parse_batches`
- `parse_batch_items`
- `claim_parse_batch_items(batch_id uuid, worker_id text, batch_size integer)`
- RLS policies
- service-role-only `GRANT EXECUTE` on claim RPC
- `set_updated_at()` triggers
- indexes and Realtime publication

**Step 2: Apply migration to a real Postgres target**

Run one of:

```bash
npx supabase db reset
```

or

```bash
npx supabase db push --db-url "<dev-db-url>"
```

Expected: migration applies cleanly.

**Step 3: Verify DB objects**

Check:

- both tables exist
- RLS is enabled
- RPC exists
- publications include both tables

**Step 4: Commit**

```bash
git add supabase/migrations/20260315170000_092_parse_batch_queue.sql
git commit -m "feat: add durable parse batch queue schema"
```

### Task 3: Extract Shared Parse Dispatch Logic

**Files:**
- Create: `supabase/functions/_shared/parse_dispatch.ts`
- Modify: `supabase/functions/trigger-parse/index.ts`
- Test: `supabase/functions/_shared/parse_dispatch.test.ts`
- Test: targeted `deno check` for `trigger-parse/index.ts`

**Step 1: Write failing dispatch tests**

Cover:

- parseable status accepted
- non-parseable status rejected
- retryable failure classification
- terminal failure classification
- ack-timeout classification

**Step 2: Run tests to verify failure**

Run:

```bash
deno test supabase/functions/_shared/parse_dispatch.test.ts
```

Expected: FAIL because shared module does not exist.

**Step 3: Move heavy parse-dispatch work into shared code**

Refactor existing `trigger-parse` behavior into reusable functions with typed return values. Keep behavior unchanged for single-file dispatch during this step.

**Step 4: Rewire `trigger-parse` to use shared code**

`trigger-parse` should become a thin HTTP wrapper over the shared dispatcher.

**Step 5: Run verification**

Run:

```bash
deno test supabase/functions/_shared/parse_dispatch.test.ts
deno check supabase/functions/trigger-parse/index.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add supabase/functions/_shared/parse_dispatch.ts supabase/functions/trigger-parse/index.ts
git commit -m "refactor: extract shared parse dispatch runtime"
```

### Task 4: Add Parse Batch Submit Endpoint

**Files:**
- Create: `supabase/functions/parse-batch-submit/index.ts`
- Create: `supabase/functions/parse-batch-submit/index.test.ts`
- Modify: `supabase/functions/_shared/supabase.ts` only if shared helpers are needed

**Step 1: Write failing endpoint tests**

Cover:

- accepts parseable docs and creates batch/items
- skips docs in `parsed` or `converting`
- rejects mixed-owner source UIDs
- returns `202` with `batch_id`

**Step 2: Run tests to verify failure**

Run:

```bash
deno test supabase/functions/parse-batch-submit/index.test.ts
```

Expected: FAIL because endpoint does not exist.

**Step 3: Implement validate-and-queue endpoint**

Rules:

- use authenticated user context
- resolve allowed docs from `source_documents`
- insert batch row
- insert item rows with policy-derived `max_attempts`
- do not call conversion service

**Step 4: Run verification**

Run:

```bash
deno test supabase/functions/parse-batch-submit/index.test.ts
deno check supabase/functions/parse-batch-submit/index.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/parse-batch-submit/index.ts supabase/functions/parse-batch-submit/index.test.ts
git commit -m "feat: add parse batch submit endpoint"
```

### Task 5: Add Parse Worker and Retry Semantics

**Files:**
- Create: `supabase/functions/parse-worker/index.ts`
- Create: `supabase/functions/parse-worker/index.test.ts`
- Modify: `supabase/functions/_shared/conversion-ack-timeout.ts` only if moved under policy control
- Modify: `supabase/functions/_shared/admin_policy.ts`

**Step 1: Write failing worker tests**

Cover:

- claims queued items atomically
- updates item status to `dispatching`
- moves accepted dispatches to `converting`
- schedules retryable failures with `next_retry_at`
- marks terminal failures `failed`
- completes batch counters and batch terminal state

**Step 2: Run tests to verify failure**

Run:

```bash
deno test supabase/functions/parse-worker/index.test.ts
```

Expected: FAIL because worker does not exist.

**Step 3: Implement worker loop**

Follow existing queue-worker conventions:

- service-role admin client
- load `parse.*` runtime policy
- claim up to configured batch size
- process item-by-item via shared dispatch module
- update item/batch counters transactionally where practical

**Step 4: Run verification**

Run:

```bash
deno test supabase/functions/parse-worker/index.test.ts
deno check supabase/functions/parse-worker/index.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/parse-worker/index.ts supabase/functions/parse-worker/index.test.ts
git commit -m "feat: add durable parse worker"
```

### Task 6: Replace Browser Queue with Durable Batch UI

**Files:**
- Modify: `web/src/hooks/useBatchParse.ts`
- Create: `web/src/hooks/useParseBatchSubmit.ts`
- Create: `web/src/hooks/useParseBatchStatus.ts`
- Modify: `web/src/hooks/useProjectDocuments.ts`
- Modify: `web/src/components/documents/ParseConfigColumn.tsx`
- Modify: `web/src/components/documents/ParseTabPanel.tsx`
- Modify: `web/src/pages/useParseWorkbench.tsx`
- Test: parse page / parse workbench tests nearest current coverage

**Step 1: Write failing UI tests**

Cover:

- `Parse Selected` submits only parseable docs
- skipped docs are reported
- active batch progress updates from batch/item state
- fallback refresh runs when realtime is absent

**Step 2: Run tests to verify failure**

Run:

```bash
cd web && npm run test -- src/pages/useParseWorkbench.test.tsx
```

Expected: FAIL because the durable batch hooks are missing.

**Step 3: Add durable batch hooks**

Implement:

- submit endpoint call
- realtime subscriptions for `parse_batches` and `parse_batch_items`
- polling while non-terminal work exists
- focus-triggered reconcile

**Step 4: Fix immediate UX hazards**

Change `ParseConfigColumn` so:

- `Parse Selected` filters to parseable rows
- button label still reflects selection, but helper text shows submitted vs skipped
- `batch.cancel` only appears if real server-side cancel is supported; otherwise remove misleading button

**Step 5: Run verification**

Run:

```bash
cd web && npm run test -- src/pages/useParseWorkbench.test.tsx
cd web && npx tsc --noEmit
```

Expected: PASS

**Step 6: Commit**

```bash
git add web/src/hooks/useBatchParse.ts web/src/hooks/useParseBatchSubmit.ts web/src/hooks/useParseBatchStatus.ts web/src/hooks/useProjectDocuments.ts web/src/components/documents/ParseConfigColumn.tsx web/src/components/documents/ParseTabPanel.tsx web/src/pages/useParseWorkbench.tsx
git commit -m "feat: move parse batch UI to durable server queue"
```

### Task 7: End-to-End Verification and Operational Readiness

**Files:**
- Modify: docs/runbooks or operator docs if needed
- Test: manual verification notes

**Step 1: Run function verification**

Run:

```bash
deno check supabase/functions/trigger-parse/index.ts
deno check supabase/functions/parse-batch-submit/index.ts
deno check supabase/functions/parse-worker/index.ts
```

Expected: PASS

**Step 2: Run web verification**

Run:

```bash
cd web && npx tsc --noEmit
```

Expected: PASS

**Step 3: Run migration verification on real DB**

Run one of:

```bash
npx supabase db reset
```

or

```bash
npx supabase db push --db-url "<dev-db-url>"
```

Expected: PASS with `_092_` applied.

**Step 4: Manual smoke test**

Verify:

- select 10 uploaded/unparsed docs
- submit Parse Selected
- close and reopen page
- batch state persists
- statuses continue advancing
- no full-page refresh is required for final state visibility

**Step 5: Commit**

```bash
git add .
git commit -m "chore: verify durable parse batch runtime"
```

## Notes for Implementation

- Do not let user clients call claim RPCs directly.
- Do not create a self-invoking edge-function loop; keep queue submission and worker execution separate.
- Do not keep operational parse knobs hardcoded in React once policy-backed controls exist.
- Do not preserve the current misleading `Cancel` button unless the server can actually honor cancellation semantics.
- Prefer batch-of-one for row-level parse so the product has one queue model, not two.
