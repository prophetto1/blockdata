# Supabase SQL Alignment Finalization Plan

**Goal:** Restore a fully aligned Supabase SQL state where the repo keeps immutable migration history, local replay succeeds from scratch on a proven toolchain, and the linked dev project matches the repo-defined migration contract without hidden drift.

**Architecture:** Treat the current `master` / `origin/master` SQL history as the immutable baseline, including the already-landed historical-file changes from the reconciliation batch. Keep the additive reconciliation migrations as the schema fix, avoid any further edits to historical migration files, standardize replay and deploy on one explicitly proven Supabase CLI/runtime pair, then rerun the canonical local and linked verification flow. If the current immutable baseline still cannot replay on any proven toolchain, stop and write a separate additive replay-repair plan instead of rewriting historical SQL again.

**Tech Stack:** Supabase CLI, Supabase Postgres migrations, GitHub Actions, Node 24 test runner, `pg`, pytest.

**Status:** Draft
**Author:** Codex
**Date:** 2026-04-03

## Manifest

### Platform API

No API routes, request shapes, response shapes, or auth rules change in this plan.

### Observability

No new runtime telemetry is introduced. Evidence remains limited to CLI output, workflow tests, schema-contract tests, and pytest output.

### Database Migrations

**New migrations:** `0`

**Final branch diff for existing migrations:** `0` modified historical migration files allowed

Frozen migration-history rule:

- Existing migration files remain immutable.
- The already-added additive reconciliation migrations remain the source of truth.
- This plan does not authorize any new schema migration unless a separate follow-up plan is written.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

No frontend files are changed in this plan.

## Source Documents

- [2026-04-03-supabase-migration-reconciliation-successor-plan.md](/E:/writing-system/docs/plans/2026-04-03-supabase-migration-reconciliation-successor-plan.md)
- [2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md](/E:/writing-system/docs/plans/2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md)
- [migration-history-hygiene.yml](/E:/writing-system/.github/workflows/migration-history-hygiene.yml)
- [supabase-db-validate.yml](/E:/writing-system/.github/workflows/supabase-db-validate.yml)
- [supabase-db-deploy.yml](/E:/writing-system/.github/workflows/supabase-db-deploy.yml)
- [20260319190000_102_user_storage_quota.sql](/E:/writing-system/supabase/migrations/20260319190000_102_user_storage_quota.sql)
- [20260321200000_auth_oauth_attempts.sql](/E:/writing-system/supabase/migrations/20260321200000_auth_oauth_attempts.sql)
- [supabase-extension-replay-guardrails.test.mjs](/E:/writing-system/scripts/tests/supabase-extension-replay-guardrails.test.mjs)
- [supabase-db-workflows.test.mjs](/E:/writing-system/scripts/tests/supabase-db-workflows.test.mjs)

## Verified Current State

- The additive reconciliation migrations from the successor plan already exist and the linked dev project has been advanced through them.
- Commit `3ade2802` on `master` already changed [20260319190000_102_user_storage_quota.sql](/E:/writing-system/supabase/migrations/20260319190000_102_user_storage_quota.sql) and [20260321200000_auth_oauth_attempts.sql](/E:/writing-system/supabase/migrations/20260321200000_auth_oauth_attempts.sql), and `origin/master` matches that state.
- Those two historical files are therefore part of the current immutable baseline. Reverting them now would itself be a new migration-history rewrite.
- The current guardrail in [supabase-extension-replay-guardrails.test.mjs](/E:/writing-system/scripts/tests/supabase-extension-replay-guardrails.test.mjs) already matches that baseline by allowing only the bootstrap migration to issue a raw `CREATE EXTENSION IF NOT EXISTS pgcrypto;`.
- Both database workflows still use `supabase/setup-cli@v1` with `version: latest` in [supabase-db-validate.yml](/E:/writing-system/.github/workflows/supabase-db-validate.yml) and [supabase-db-deploy.yml](/E:/writing-system/.github/workflows/supabase-db-deploy.yml), so local and CI replay are not pinned to one proven toolchain.
- The current local environment is `supabase` CLI `2.84.9` with local Postgres image `17.6.1.063`.

## Pre-Implementation Contract

No major SQL, workflow, or linked-history decision may be improvised during implementation. If immutable history cannot be restored while preserving clean replay, stop and revise the plan instead of widening scope ad hoc.

### Locked Product Decisions

1. Historical migration files, including [20260319190000_102_user_storage_quota.sql](/E:/writing-system/supabase/migrations/20260319190000_102_user_storage_quota.sql) and [20260321200000_auth_oauth_attempts.sql](/E:/writing-system/supabase/migrations/20260321200000_auth_oauth_attempts.sql), must remain unchanged relative to the current immutable `master` / `origin/master` baseline.
2. This plan does not introduce any new SQL schema semantics. It only restores history hygiene, replay determinism, and linked-history verification.
3. The linked-project apply flow remains `supabase link --project-ref ...` -> `supabase migration list` -> `supabase db push` -> `supabase migration list`.
4. `migration repair` remains forbidden except for the exact allowed linked-history repair map already locked in the successor plan.
5. The extension replay guardrail must freeze the current immutable baseline: only [20260202102234_001_phase1_immutable_documents_blocks.sql](/E:/writing-system/supabase/migrations/20260202102234_001_phase1_immutable_documents_blocks.sql) may issue a raw `CREATE EXTENSION IF NOT EXISTS pgcrypto;`.
6. The validation and deploy workflows must pin the same exact Supabase CLI version once one clean-replay version is proven.
7. If no exact Supabase CLI/runtime pair can replay immutable history cleanly, stop and write a new additive replay-repair plan. Do not keep the historical SQL rewrites.
8. Task 2 is a hard stop/go gate. No workflow pinning, local re-verification, or linked verification may proceed until one exact immutable replay toolchain is proven.
9. Task 5 is a hard stop/go gate. If linked verification reveals drift outside the locked repair map, this plan stops immediately and a separate linked-history plan must be written.

### Locked Acceptance Contract

The SQL layer is only considered aligned when all of the following are true:

1. `git diff --name-status` for `supabase/migrations` shows no modified or deleted historical migration files.
2. The extension replay guardrail passes while allowing exactly the current immutable raw-`pgcrypto` set, which is the bootstrap migration only, and no new offenders.
3. One explicit Supabase CLI version is proven to replay the immutable migration chain locally from scratch.
4. Both [supabase-db-validate.yml](/E:/writing-system/.github/workflows/supabase-db-validate.yml) and [supabase-db-deploy.yml](/E:/writing-system/.github/workflows/supabase-db-deploy.yml) pin that exact CLI version.
5. `cd supabase && npx supabase db reset --yes` succeeds on the pinned toolchain.
6. `npm run test:supabase-migration-reconciliation-contract` passes against the fresh local database.
7. `pytest -q tests/test_storage_routes.py tests/test_storage_source_documents.py tests/test_storage_download_url.py` passes.
8. Linked dev verification runs through the canonical repo flow and leaves the linked migration list aligned with the repo contract.

### Locked Platform API Surface

No platform API changes.

### Locked Observability Surface

No runtime observability changes.

### Locked Inventory Counts

#### Database

- New migrations: `0`
- Modified historical migrations in final branch diff: `0`

#### CI / Validation

- Modified workflow files: `2`
- Modified Node test modules: `2`
- Modified root manifest files: `1`

#### Frontend

- Modified pages: `0`
- Modified components: `0`

### Locked File Inventory

#### Modified files expected in final branch diff

- [.github/workflows/supabase-db-validate.yml](/E:/writing-system/.github/workflows/supabase-db-validate.yml)
- [.github/workflows/supabase-db-deploy.yml](/E:/writing-system/.github/workflows/supabase-db-deploy.yml)
- [package.json](/E:/writing-system/package.json)
- [scripts/tests/supabase-db-workflows.test.mjs](/E:/writing-system/scripts/tests/supabase-db-workflows.test.mjs)
- [scripts/tests/supabase-extension-replay-guardrails.test.mjs](/E:/writing-system/scripts/tests/supabase-extension-replay-guardrails.test.mjs)

#### Historical migration files forbidden from modification in this plan

- [supabase/migrations/20260319190000_102_user_storage_quota.sql](/E:/writing-system/supabase/migrations/20260319190000_102_user_storage_quota.sql)
- [supabase/migrations/20260321200000_auth_oauth_attempts.sql](/E:/writing-system/supabase/migrations/20260321200000_auth_oauth_attempts.sql)

These two migration files are already part of the immutable `master` baseline and must not be edited in this plan.

## Frozen Extension Replay Contract

The compatibility-sensitive seam is the raw `CREATE EXTENSION IF NOT EXISTS pgcrypto;` statement inside immutable historical migrations.

Frozen rules:

- This plan does not authorize rewriting any historical migration file.
- The guardrail freezes the current immutable baseline rather than attempting to restore an earlier pre-`master` state.
- Replay alignment must be achieved by a proven Supabase CLI/runtime pair plus verification, not by further editing historical SQL.
- If that is not possible, stop and write a separate additive replay-repair plan with explicit root-cause proof.

## Explicit Risks Accepted In This Plan

1. The proven clean-replay Supabase CLI version may be older than `latest`; version pinning is acceptable if it is the only way to keep immutable history truthful.
2. The linked dev project may still surface out-of-scope storage remote-only timestamps from the successor-plan takeover notes; if those reappear as a blocker, this plan stops instead of repairing them ad hoc.
3. This plan closes SQL alignment only. It does not absorb unrelated web work already present in the worktree.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked file inventory matches the final diff.
2. No historical migration file remains modified in the final diff.
3. The workflows use one exact Supabase CLI version instead of `latest`.
4. Local replay, schema contract, and targeted storage pytest verification all pass on the pinned toolchain.
5. Linked migration verification succeeds without violating the locked repair map.

## Task 1: Freeze the current immutable `pgcrypto` guardrail contract

**File(s):** [scripts/tests/supabase-extension-replay-guardrails.test.mjs](/E:/writing-system/scripts/tests/supabase-extension-replay-guardrails.test.mjs)

**Step 1:** Confirm against `origin/master` that the immutable raw-`pgcrypto` set is the bootstrap migration only.
**Step 2:** Keep or adjust the guardrail test so it matches that current immutable baseline exactly.
**Step 3:** Run the guardrail test and confirm it passes with no extra offender files.

**Test command:** `npm run test:supabase-extension-replay-guardrails`
**Expected output:** One passing test that allows exactly the current immutable baseline and fails if any other migration introduces a raw `pgcrypto` create.

**Commit:** `test(db): freeze immutable pgcrypto allowlist`

## Task 2: Hard Stop/Go Gate - Prove one clean immutable replay toolchain

**File(s):** none

**Step 1:** Record the current local CLI version and the local Postgres image actually used for replay.
**Step 2:** Run a full local replay against immutable history with `cd supabase && npx supabase db start && npx supabase db reset --yes`.
**Step 3:** If replay fails, test candidate Supabase CLI versions one at a time until one exact CLI/runtime pair replays immutable history successfully.
**Step 4:** Treat this task as a hard gate. If no exact version can replay immutable history cleanly, stop and write a separate additive replay-repair plan instead of continuing.

**Test command:** `cd supabase && npx supabase db start && npx supabase db reset --yes`
**Expected output:** Exit code `0` on one explicitly identified Supabase CLI version and its corresponding local Postgres image. Any failure to prove that exact pair is a stop condition for the rest of this plan.

**Commit:** `chore(db): prove immutable replay toolchain`

## Task 3: Pin the proven Supabase CLI version in CI

**File(s):** [.github/workflows/supabase-db-validate.yml](/E:/writing-system/.github/workflows/supabase-db-validate.yml), [.github/workflows/supabase-db-deploy.yml](/E:/writing-system/.github/workflows/supabase-db-deploy.yml), [scripts/tests/supabase-db-workflows.test.mjs](/E:/writing-system/scripts/tests/supabase-db-workflows.test.mjs)

**Step 1:** Replace `version: latest` in both database workflows with the exact proven Supabase CLI version from Task 2.
**Step 2:** Extend the workflow contract test so it asserts the pinned version in both workflows.
**Step 3:** Re-run the workflow guardrail test and confirm it passes.

**Test command:** `npm run test:workflow-guardrails`
**Expected output:** All workflow guardrail tests pass and both workflow files pin the same exact Supabase CLI version.

**Commit:** `ci(db): pin verified supabase cli version`

## Task 4: Reprove the canonical local SQL validation chain

**File(s):** [package.json](/E:/writing-system/package.json) only if a script-path correction is needed; otherwise no new files

**Step 1:** Run the extension replay guardrail.
**Step 2:** Run the workflow guardrail test.
**Step 3:** Run `cd supabase && npx supabase db start && npx supabase db reset --yes`.
**Step 4:** Run the local reconciliation contract test against `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
**Step 5:** Run the storage-focused platform API verification suite.

**Test command:** `npm run test:supabase-extension-replay-guardrails && npm run test:workflow-guardrails && cd supabase && npx supabase db start && npx supabase db reset --yes && cd .. && $env:TEST_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres'; npm run test:supabase-migration-reconciliation-contract && cd services/platform-api && pytest -q tests/test_storage_routes.py tests/test_storage_source_documents.py tests/test_storage_download_url.py`
**Expected output:** Every command exits `0`; the local database resets cleanly and the contract plus storage verification suites pass.

**Commit:** `test(db): reprove local sql alignment`

## Task 5: Hard Stop/Go Gate - Reprove linked dev alignment through the canonical deploy path

**File(s):** none

**Step 1:** Confirm `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `DATABASE_URL` are present.
**Step 2:** Run `cd supabase && npx supabase link --project-ref $SUPABASE_PROJECT_REF`.
**Step 3:** Capture `npx supabase migration list` before any write.
**Step 4:** Treat this task as a hard gate. If the only remote-only drift is the locked allowed repair map from the successor plan, apply only that bounded repair. Otherwise stop immediately and write a separate linked-history plan.
**Step 5:** Run `npx supabase db push`.
**Step 6:** Re-run `npx supabase migration list`.
**Step 7:** Run the reconciliation contract test against `DATABASE_URL`.

**Test command:** `cd supabase && npx supabase link --project-ref $SUPABASE_PROJECT_REF && npx supabase migration list && npx supabase db push && npx supabase migration list && cd .. && $env:TEST_DATABASE_URL=$env:DATABASE_URL; npm run test:supabase-migration-reconciliation-contract`
**Expected output:** The linked migration list shows no unexplained drift or pending repo migrations, and the reconciliation contract test passes against the linked database. Any drift outside the locked map is a stop condition for this plan.

**Commit:** `chore(db): verify linked sql alignment`

## Task 6: Final immutable-history audit

**File(s):** none

**Step 1:** Confirm `git diff --name-status` for `supabase/migrations` shows no modified historical migration files.
**Step 2:** Confirm the workflow and extension guardrail tests still pass.
**Step 3:** Confirm the final branch diff matches the locked inventory and contains only additive migration history changes.

**Test command:** `git diff --name-status -- supabase/migrations && npm run test:supabase-extension-replay-guardrails && npm run test:workflow-guardrails`
**Expected output:** `supabase/migrations` shows only `A` records or no output; no `M` or `D` entries remain, and both guardrail suites pass.

**Commit:** `chore(db): finalize immutable sql alignment`
