# 2026-04-03 Supabase Migration Reconciliation Successor Plan

**Goal:** Restore a forward-replayable and linked-deployable Supabase migration chain across the `069` rename seam without rewriting already-applied historical migration files, so local `supabase db reset` succeeds past `073` and `091`, the linked project can be advanced through the repo-defined CLI flow, and the blocked storage namespace closeout can resume on a truthful `public.user_projects` contract.

**Architecture:** Treat `public.user_projects` as the only final project authority after `20260305120050_069_user_projects_rename.sql`. Do not edit `073`, `091`, or `102` in place. Instead, add one new backdated compatibility migration immediately before `073` that temporarily recreates the minimum `public.projects` contract needed for replay, then add one new backdated reconciliation migration immediately after `091` that retargets all affected foreign keys and RLS policies to `public.user_projects`, removes the temporary compatibility relation, and re-locks the final schema to the currently verified linked-project contract. Add a database contract test plus CI wiring so replayed local state and linked-project state can be asserted directly instead of inferred from migration success alone.

**Tech Stack:** Supabase CLI, Supabase Postgres SQL migrations, Postgres RLS and helper functions, Node 24 test runner with `pg`, GitHub Actions, FastAPI runtime verification, pytest.
**Status:** Draft
**Date:** 2026-04-03

## Source Of Truth

This successor plan is derived from:

- [2026-04-01-supabase-migration-reconciliation-plan.md](/E:/writing-system/docs/plans/2026-04-01-supabase-migration-reconciliation-plan.md)
- [2026-04-03-supabase-migration-reconciliation-takeover-notes.md](/E:/writing-system/docs/plans/__complete/notes/2026-04-03-supabase-migration-reconciliation-takeover-notes.md)
- [2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md](/E:/writing-system/docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md)
- [2026-04-02-storage-namespace-closure-verification-report.md](/E:/writing-system/docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md)
- [20260305120050_069_user_projects_rename.sql](/E:/writing-system/supabase/migrations/20260305120050_069_user_projects_rename.sql)
- [20260309183000_073_normalize_flow_identity.sql](/E:/writing-system/supabase/migrations/20260309183000_073_normalize_flow_identity.sql)
- [20260314180000_091_extraction_tables.sql](/E:/writing-system/supabase/migrations/20260314180000_091_extraction_tables.sql)
- [20260319190000_102_user_storage_quota.sql](/E:/writing-system/supabase/migrations/20260319190000_102_user_storage_quota.sql)
- [supabase-db-deploy.yml](/E:/writing-system/.github/workflows/supabase-db-deploy.yml)
- [supabase-db-validate.yml](/E:/writing-system/.github/workflows/supabase-db-validate.yml)
- [migration-history-hygiene.yml](/E:/writing-system/.github/workflows/migration-history-hygiene.yml)
- linked-project migration and schema state verified on `2026-04-03` through Supabase MCP:
  - remote migration history already contains `20260309183000` and `20260314180000`
  - `public.user_projects` exists
  - `public.projects` does not exist
  - current linked foreign keys and policies for `flow_executions`, `flow_logs`, and `extraction_schemas` already point to `public.user_projects`

## Verified Current State

### The inherited April 1 execution path is now contradicted

- The April 1 plan explicitly requires `073` and `091` to be absent from the linked project before any in-place SQL edits are allowed.
- Current linked-project migration history already contains:
  - `20260309183000` `073_normalize_flow_identity`
  - `20260314180000` `091_extraction_tables`
- That means the April 1 preferred path, "edit `073` and `091` in place and then `db push`", is no longer safe or truthful.

### Local replay still fails exactly where the original blocker said it would

- [20260309183000_073_normalize_flow_identity.sql](/E:/writing-system/supabase/migrations/20260309183000_073_normalize_flow_identity.sql) still references `public.projects` in:
  - relationship comments
  - `flow_executions_project_id_fkey`
  - `flow_logs_project_id_fkey`
  - all `flow_executions_*_own` ownership policies
  - all `flow_logs_*_own` ownership policies
- [20260314180000_091_extraction_tables.sql](/E:/writing-system/supabase/migrations/20260314180000_091_extraction_tables.sql) still references `public.projects` / unqualified `projects` in:
  - `extraction_schemas.project_id`
  - `extraction_schemas_insert_own`
  - `extraction_schemas_update_own`
- [20260319190000_102_user_storage_quota.sql](/E:/writing-system/supabase/migrations/20260319190000_102_user_storage_quota.sql) already bridges `public.user_projects` and `public.projects` and is verification-only scope.

### The linked project's final contract is already normalized to `public.user_projects`

- Verified linked-project foreign keys:
  - `public.flow_executions.flow_executions_project_id_fkey` -> `public.user_projects`
  - `public.flow_logs.flow_logs_project_id_fkey` -> `public.user_projects`
  - `public.extraction_schemas.extraction_schemas_project_id_fkey` -> `public.user_projects`
- Verified linked-project policies:
  - `flow_executions_select_own`, `insert_own`, and `update_own` scope through `user_projects`
  - `flow_logs_select_own` and `insert_own` scope through `user_projects` with the existing `project_id IS NULL OR EXISTS (...)` allowance
  - `flow_logs_service_role` remains present
  - `extraction_schemas_insert_own` and `update_own` scope through `user_projects`
- Verified linked-project relation state:
  - `to_regclass('public.projects')` = `NULL`
  - `to_regclass('public.user_projects')` = `user_projects`

### The repo now enforces additive-only migration history

- [migration-history-hygiene.yml](/E:/writing-system/.github/workflows/migration-history-hygiene.yml) rejects modification or deletion of existing migration files.
- A correct successor plan must therefore repair replay and linked apply without editing existing migration files `073`, `091`, or `102`.

### Known-equivalent remote-only migration history drift exists on the linked dev project

- The linked dev project currently records remote-only timestamps that map to repo-owned local migrations with different timestamps:
  - remote `20260402192042` <-> local [20260402180000_propagate_storage_quota_policy_to_all_users.sql](/E:/writing-system/supabase/migrations/20260402180000_propagate_storage_quota_policy_to_all_users.sql)
  - remote `20260403015223` <-> local [20260402193000_storage_namespace_metadata_foundation.sql](/E:/writing-system/supabase/migrations/20260402193000_storage_namespace_metadata_foundation.sql)
  - remote `20260403015236` <-> local [20260402194000_pipeline_source_registry_and_fk_migration.sql](/E:/writing-system/supabase/migrations/20260402194000_pipeline_source_registry_and_fk_migration.sql)
  - remote `20260403015424` <-> local [20260402195000_storage_namespace_backfill_and_source_document_reconciliation.sql](/E:/writing-system/supabase/migrations/20260402195000_storage_namespace_backfill_and_source_document_reconciliation.sql)
  - remote `20260403100529` <-> local [20260402170000_agchain_settings_permission_groups_and_invites_schema.sql](/E:/writing-system/supabase/migrations/20260402170000_agchain_settings_permission_groups_and_invites_schema.sql)
  - remote `20260403100530` <-> local [20260402171000_agchain_settings_owners_backfill.sql](/E:/writing-system/supabase/migrations/20260402171000_agchain_settings_owners_backfill.sql)
- Proof level:
  - the two AGChain settings remote-only versions were applied from the exact repo file contents in the current linked project during this session
  - the four storage remote-only versions have only migration-name equivalence plus compatible current schema symptoms; that is not strong enough proof for history repair in this plan
- This drift is not the original `069` blocker, but the successor plan must account for it during linked verification so `db push` does not become a hidden secondary stop condition.
- This successor plan may repair only the two AGChain settings remote-only versions proven from exact repo file contents.
- The four storage remote-only versions are explicitly out of repair scope here. If they block linked `db push`, stop and write a dedicated linked-history recovery plan instead of widening this batch.

## Manifest

### Platform API

### Existing runtime surfaces only

- No API routes change in this batch.
- No request or response shape changes are introduced.

### Verification-only runtime contract

- Existing runtime verification still matters because the reconciled schema is upstream of:
  - storage routes exercised by `test_storage_routes.py`, `test_storage_source_documents.py`, and `test_storage_download_url.py`
  - pipeline routes exercised by `test_pipelines_routes.py`, `test_pipeline_source_sets_routes.py`, `test_pipeline_source_sets_service.py`, and `test_pipeline_source_library.py`
  - AGChain workspace and dataset seams exercised by `test_agchain_workspaces.py` and `test_agchain_datasets.py`

### Frontend Surface Area

### No frontend changes

- No frontend files are changed in this batch.
- No page, component, or route contract changes are in scope.

### Database Migrations

### New additive migrations in this batch

1. [20260309182900_user_projects_replay_compat_bridge.sql](/E:/writing-system/supabase/migrations/20260309182900_user_projects_replay_compat_bridge.sql)
   - purpose: make replay succeed without editing `073`
   - schema effect: immediately before `073`, temporarily create the minimum `public.projects` compatibility relation required by `073` and `091`
   - data impact: additive backfill of `(project_id, owner_id)` from `public.user_projects` into the temporary compatibility relation only; no rewrite of the final project-authority table
2. [20260314183030_user_projects_flow_and_extraction_reconcile.sql](/E:/writing-system/supabase/migrations/20260314183030_user_projects_flow_and_extraction_reconcile.sql)
   - purpose: restore the final `public.user_projects` contract after `073` and `091` finish replaying
   - schema effect: immediately after `091`, retarget the affected foreign keys and RLS policies to `public.user_projects` and remove the temporary compatibility relation
   - data impact: no user-data rewrite; contract restoration is limited to FK, policy, and temporary relation cleanup

### Historical migrations explicitly frozen

- [20260305120050_069_user_projects_rename.sql](/E:/writing-system/supabase/migrations/20260305120050_069_user_projects_rename.sql)
- [20260309183000_073_normalize_flow_identity.sql](/E:/writing-system/supabase/migrations/20260309183000_073_normalize_flow_identity.sql)
- [20260314180000_091_extraction_tables.sql](/E:/writing-system/supabase/migrations/20260314180000_091_extraction_tables.sql)
- [20260319190000_102_user_storage_quota.sql](/E:/writing-system/supabase/migrations/20260319190000_102_user_storage_quota.sql)

No edits to those files are allowed in this plan.

### Edge Functions

### No edge function changes

- No edge function files are changed in this batch.
- No edge runtime or deploy-flow changes are introduced.

### Observability

### No new runtime telemetry

- This batch does not add a new backend-owned runtime seam.
- No new OpenTelemetry spans, counters, structured logs, or readiness surfaces are required.

### Allowed evidence surfaces

- CLI evidence captured in the verification report
- local replay evidence
- linked-project migration-list evidence
- schema-contract test output
- pytest output

## Locked Platform API Surface

- No API routes, service files, request shapes, or response shapes change in this batch.
- Existing runtime verification remains verification-only scope.

## Locked Observability Surface

- No new runtime telemetry is created.
- Evidence is carried only through migration output, contract-test output, pytest output, and the final verification report.

## Pre-Implementation Contract

No major decision may be improvised during implementation. If any item below needs to change, stop and revise this plan first.

## Locked Product Decisions

1. `public.user_projects` remains the only final live project authority after `069`.
2. `073`, `091`, and `102` remain immutable in this batch.
3. A temporary recreated `public.projects` relation is allowed only inside a new additive compatibility migration and only if the later reconciliation migration removes it again.
4. `public.projects` must not exist at the end of local replay or linked-project verification.
5. The successor fix is additive. It must not solve the replay failure by rewriting already-applied migration files.
6. `102` remains unchanged and continues to bridge either relation name when checking storage ownership.
7. Existing storage replay repairs in `20260220193000`, `052`, and `065` remain untouched.
8. Existing storage namespace migrations in `20260402193000`, `20260402194000`, and `20260402195000` remain untouched.
9. Existing AGChain settings migrations in `20260402170000` and `20260402171000` remain untouched.
10. No platform-api or frontend implementation changes are in scope.
11. The repo deploy flow remains `supabase link` -> `supabase migration list` -> `supabase db push` -> `supabase migration list`.
12. `migration repair` is forbidden except for the exact AGChain settings linked-history drift map locked in this plan, and only if that drift is what prevents linked verification from using the repo-defined flow.
13. The four storage remote-only timestamps are not repairable in this plan because exact SQL-equivalence proof is not locked.

## Locked Final Schema Contract

### Final project authority

- `public.user_projects` exists.
- `public.projects` does not exist.

### Final foreign-key targets

- `public.flow_executions.project_id` references `public.user_projects(project_id)`
- `public.flow_logs.project_id` references `public.user_projects(project_id)`
- `public.extraction_schemas.project_id` references `public.user_projects(project_id)`

### Final policy contract

- `public.flow_executions`
  - `flow_executions_select_own` scopes by `public.user_projects`
  - `flow_executions_insert_own` scopes by `public.user_projects`
  - `flow_executions_update_own` scopes by `public.user_projects`
  - `flow_executions_delete_own` does not exist
- `public.flow_logs`
  - `flow_logs_select_own` uses the linked-project contract: `project_id IS NULL OR EXISTS (...)` against `public.user_projects`
  - `flow_logs_insert_own` uses the linked-project contract: `project_id IS NULL OR EXISTS (...)` against `public.user_projects`
  - `flow_logs_service_role` remains present
  - `flow_logs_update_own` does not exist
  - `flow_logs_delete_own` does not exist
- `public.extraction_schemas`
  - `extraction_schemas_select_own` remains owner-based
  - `extraction_schemas_delete_own` remains owner-based
  - `extraction_schemas_insert_own` scopes project membership through `public.user_projects`
  - `extraction_schemas_update_own` scopes project membership through `public.user_projects`

## Locked Compatibility Bridge Contract

### Temporary relation shape

The new pre-`073` compatibility migration may create `public.projects` only with the minimum columns required by `073`, `091`, and their ownership checks:

- `project_id uuid primary key`
- `owner_id uuid not null`

It may also add a supporting owner index.

### Temporary data behavior

- If `public.user_projects` exists and `public.projects` does not, the compatibility migration may backfill `(project_id, owner_id)` from `public.user_projects` with `ON CONFLICT DO NOTHING`.
- The compatibility relation must not become a new final authority surface.
- The later reconciliation migration must drop it once the final `public.user_projects` contract is restored.

## Locked Linked History Repair Contract

### Allowed repair map

Linked-history repair is allowed only if `supabase migration list` shows the exact remote-only versions below and no extra unexplained remote-only versions:

| Remote-only version | Local repo-equivalent version | Proof basis |
| --- | --- | --- |
| `20260403100529` | `20260402170000` | exact repo file content applied in-session |
| `20260403100530` | `20260402171000` | exact repo file content applied in-session |

### Forbidden repair

- Do not repair `073`, `091`, `102`, or any other migration version in this plan.
- Do not use `migration repair` to skip the new reconciliation migrations.
- Do not repair the four storage remote-only timestamps `20260402192042`, `20260403015223`, `20260403015236`, or `20260403015424` in this plan.
- If linked history contains any remote-only timestamp outside the table above, stop execution and write a separate linked-history recovery plan instead of widening this batch.

## Locked Linked Verification Prerequisites

Linked-project verification and linked contract testing may run only when all of the following are present in the local environment loaded from `.env`:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `DATABASE_URL`

If any prerequisite is missing, stop and mark linked verification blocked rather than reporting a migration or schema failure.

## Locked Inventory Counts

### New files

- Database migrations: `2`
- Test scripts: `1`
- Verification reports: `1`

### Modified files

- Root config: `1`
- GitHub workflow files: `1`

### Frozen existing migration files edited

- Existing migration file edits: `0`

### Frozen runtime files edited

- Platform API runtime files: `0`
- Frontend runtime files: `0`
- Edge function files: `0`

## Locked File Inventory

### New files

- [20260309182900_user_projects_replay_compat_bridge.sql](/E:/writing-system/supabase/migrations/20260309182900_user_projects_replay_compat_bridge.sql)
- [20260314183030_user_projects_flow_and_extraction_reconcile.sql](/E:/writing-system/supabase/migrations/20260314183030_user_projects_flow_and_extraction_reconcile.sql)
- [supabase-migration-reconciliation-contract.test.mjs](/E:/writing-system/scripts/tests/supabase-migration-reconciliation-contract.test.mjs)
- [2026-04-03-supabase-migration-reconciliation-verification-report.md](/E:/writing-system/docs/plans/__complete/reports/2026-04-03-supabase-migration-reconciliation-verification-report.md)

### Modified files

- [package.json](/E:/writing-system/package.json)
- [supabase-db-validate.yml](/E:/writing-system/.github/workflows/supabase-db-validate.yml)

## Frozen Seam Contract

### Rename seam

- `20260305120050_069_user_projects_rename.sql` remains the historical seam where `public.projects` became `public.user_projects`.
- This plan does not rewrite that seam.

### Deploy and validation workflows

- [supabase-db-deploy.yml](/E:/writing-system/.github/workflows/supabase-db-deploy.yml) remains the deploy authority.
- [migration-history-hygiene.yml](/E:/writing-system/.github/workflows/migration-history-hygiene.yml) remains the additive-only guardrail.
- [supabase-db-validate.yml](/E:/writing-system/.github/workflows/supabase-db-validate.yml) remains the replay authority and is extended only to run the new contract test.

### Downstream feature plans

- This plan unblocks [2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md](/E:/writing-system/docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md).
- This plan stays separate from [2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md](/E:/writing-system/docs/plans/2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md).

## Explicit Risks Accepted In This Plan

1. New backdated migration files are being added after later timestamps already exist in the repo.
   - Mitigation: the plan relies on Supabase CLI’s timestamp-based migration tracking, local full replay, linked dry-run evidence, and the repo’s additive-only history policy.

2. The linked dev project already contains unrelated known-equivalent remote-only timestamps.
   - Mitigation: repair is tightly locked to the exact verified equivalence map above and forbidden for any other version.

3. The temporary compatibility `public.projects` table could be mistaken for a permanent authority.
   - Mitigation: the final schema contract forbids `public.projects` from surviving local or linked verification, and the contract test asserts its absence.

4. The current linked-project contract differs from the literal SQL text inside `073`.
   - Mitigation: the later reconciliation migration is required to make replayed local state match the verified linked-project end state rather than the stale historical text.

## Relationship To Other Active Work

- The April 1 plan remains historical context only and is not the executable artifact anymore.
- The storage namespace closeout plan remains blocked until this successor plan is complete.
- The linked-dev schema parity hardening plan remains separate forward-looking work and must not be merged into this batch.

## Task Breakdown

### Task 1: Add the pre-`073` replay compatibility bridge

**Files:**

- [20260309182900_user_projects_replay_compat_bridge.sql](/E:/writing-system/supabase/migrations/20260309182900_user_projects_replay_compat_bridge.sql)

**Steps:**

1. Add a new migration timestamped before `073`.
2. If `public.user_projects` exists and `public.projects` does not, create the temporary `public.projects` compatibility table with only `project_id` and `owner_id`.
3. Backfill `(project_id, owner_id)` from `public.user_projects` when available.
4. Make the migration idempotent so linked late-apply cannot fail if the compatibility table already exists.
5. Do not add new runtime-facing policies, grants, or authority decisions to the compatibility table.

**Test command:** `cd supabase && npx supabase db start && npx supabase db reset --yes`
**Expected output:** replay no longer fails on missing `public.projects` anywhere in `073` or `091`; any remaining failure occurs after the compatibility-dependent `projects` references.

**Commit:** `fix(db): add pre-073 user-projects replay compatibility bridge`

### Task 2: Add the post-`091` reconciliation migration

**Files:**

- [20260314183030_user_projects_flow_and_extraction_reconcile.sql](/E:/writing-system/supabase/migrations/20260314183030_user_projects_flow_and_extraction_reconcile.sql)

**Steps:**

1. Add a new migration timestamped after `091` and before `102`.
2. Repoint these foreign keys to `public.user_projects`:
   - `flow_executions_project_id_fkey`
   - `flow_logs_project_id_fkey`
   - `extraction_schemas_project_id_fkey`
3. Recreate the affected flow and extraction policies so they match the locked final schema contract above.
4. Make every FK, policy, and cleanup step idempotent so the migration late-applies safely on a linked project that is already normalized to `public.user_projects`.
5. Use `DROP ... IF EXISTS`, `CREATE ... IF NOT EXISTS`, or catalog-guarded replacement where needed so rerunning against already-final linked state does not fail.
6. Drop `flow_executions_delete_own`, `flow_logs_update_own`, and `flow_logs_delete_own` if present.
7. Drop the temporary `public.projects` compatibility relation if it exists.
8. Leave `102` unchanged.

**Test command:** `rg -n \"public\\.projects|FROM projects|REFERENCES public\\.projects|REFERENCES projects\" supabase/migrations/20260309183000_073_normalize_flow_identity.sql supabase/migrations/20260314180000_091_extraction_tables.sql supabase/migrations/20260319190000_102_user_storage_quota.sql`
**Expected output:** stale historical references still exist only in `073`, `091`, and the fallback branch inside `102`; the new migrations carry the actual replay and final-state repair.

**Commit:** `fix(db): reconcile flow and extraction ownership back to user_projects`

### Task 3: Add a database contract test and wire it into validation

**Files:**

- [supabase-migration-reconciliation-contract.test.mjs](/E:/writing-system/scripts/tests/supabase-migration-reconciliation-contract.test.mjs)
- [package.json](/E:/writing-system/package.json)
- [supabase-db-validate.yml](/E:/writing-system/.github/workflows/supabase-db-validate.yml)

**Steps:**

1. Add a Node test that connects through `pg`.
2. Default the test to the local Supabase DB URL and allow override through `TEST_DATABASE_URL`.
3. Assert the locked final schema contract:
   - `public.user_projects` exists
   - `public.projects` does not exist
   - the three locked FKs target `public.user_projects`
   - `flow_executions_delete_own` does not exist
   - `flow_logs_update_own` does not exist
   - `flow_logs_delete_own` does not exist
   - the locked policy set otherwise matches the contract above
4. Add a root package script for the new test.
5. Extend `supabase-db-validate.yml` so replay in CI is followed by the contract test.

**Test command:** `npm run test:supabase-migration-reconciliation-contract`
**Expected output:** the contract test passes against the replayed local database.

**Commit:** `test(db): add user-projects reconciliation contract coverage`

### Task 4: Re-run local replay and downstream backend verification

**Files:**

- [20260309182900_user_projects_replay_compat_bridge.sql](/E:/writing-system/supabase/migrations/20260309182900_user_projects_replay_compat_bridge.sql)
- [20260314183030_user_projects_flow_and_extraction_reconcile.sql](/E:/writing-system/supabase/migrations/20260314183030_user_projects_flow_and_extraction_reconcile.sql)
- [supabase-migration-reconciliation-contract.test.mjs](/E:/writing-system/scripts/tests/supabase-migration-reconciliation-contract.test.mjs)

**Steps:**

1. Start local Supabase.
2. Run a full `supabase db reset --yes`.
3. Run the new contract test locally.
4. Run the locked backend verification suite against the replayed local database.

**Test commands:**

- `cd supabase && npx supabase db start && npx supabase db reset --yes && cd .. && npm run test:supabase-migration-reconciliation-contract`
- `cd services/platform-api && pytest -q tests/test_storage_routes.py tests/test_storage_source_documents.py tests/test_storage_download_url.py tests/test_pipelines_routes.py tests/test_pipeline_source_sets_routes.py tests/test_pipeline_source_sets_service.py tests/test_pipeline_source_library.py tests/test_agchain_workspaces.py tests/test_agchain_datasets.py`

**Expected output:** local replay is green, the final schema contract is green, and downstream runtime tests are green against the replayed local database.

**Commit:** `test(db): verify replayed schema against storage pipeline and agchain suites`

### Task 5: Reconcile linked dev migration history only if the locked known-equivalent drift is present

**Files:**

- no repo file edits in this task

**Steps:**

1. Confirm `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `DATABASE_URL` are present before any linked-project command. If any are missing, stop and record linked verification as blocked.
2. Run `supabase migration list` against the linked project.
3. If remote-only drift is present, verify whether the only repairable rows are the two locked AGChain settings versions and that no other unexplained remote-only version is being repaired in this batch.
4. If that exact condition holds, repair history by reverting the two remote-only AGChain settings timestamps and marking the repo-equivalent local timestamps applied.
5. If the four storage remote-only versions appear as the remaining blocking discrepancy, stop and write a dedicated linked-history recovery plan instead of widening this batch.
6. If any extra discrepancy appears beyond those known rows, stop and write a dedicated linked-history recovery plan instead of widening this batch.

**Test command:** `cd supabase && npx supabase link --project-ref $SUPABASE_PROJECT_REF && npx supabase migration list`
**Expected output:** either:
- no unrelated remote-only drift remains, or
- the only repairable remote-only drift is the exact two-row AGChain settings map above

**Commit:** `docs(db): record bounded linked history repair evidence`

### Task 6: Apply the new reconciliation migrations to the linked project and record completion evidence

**Files:**

- [2026-04-03-supabase-migration-reconciliation-verification-report.md](/E:/writing-system/docs/plans/__complete/reports/2026-04-03-supabase-migration-reconciliation-verification-report.md)

**Steps:**

1. Confirm `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `DATABASE_URL` are present and still target the intended linked dev project. If any are missing, stop and record linked verification as blocked.
2. Run linked-project dry-run evidence before applying.
3. Run `supabase db push`.
4. Re-run `supabase migration list`.
5. If linked `db push --dry-run` or `db push` is blocked by the excluded storage remote-only timestamps, stop and write a dedicated linked-history recovery plan instead of widening this batch.
6. Run the new contract test against the linked database by exporting `TEST_DATABASE_URL` from `DATABASE_URL`.
7. Record:
   - local replay result
   - local contract-test result
   - downstream pytest result
   - linked migration-list before/after
   - whether linked repair was needed
   - linked contract-test result
8. Mark the storage namespace closeout plan unblocked only after the report is written.

**Test commands:**

- `cd supabase && npx supabase db push --dry-run`
- `cd supabase && npx supabase db push && npx supabase migration list`
- PowerShell: ``$env:TEST_DATABASE_URL=$env:DATABASE_URL; npm run test:supabase-migration-reconciliation-contract``
- Bash: `TEST_DATABASE_URL=\"$DATABASE_URL\" npm run test:supabase-migration-reconciliation-contract`

**Expected output:** the linked project shows the two new reconciliation migrations applied, the final schema contract is green, and the verification report captures enough evidence for the storage namespace closeout plan to resume.

**Commit:** `docs(db): record supabase migration reconciliation completion`

## Locked Acceptance Contract

1. [20260305120050_069_user_projects_rename.sql](/E:/writing-system/supabase/migrations/20260305120050_069_user_projects_rename.sql), [20260309183000_073_normalize_flow_identity.sql](/E:/writing-system/supabase/migrations/20260309183000_073_normalize_flow_identity.sql), [20260314180000_091_extraction_tables.sql](/E:/writing-system/supabase/migrations/20260314180000_091_extraction_tables.sql), and [20260319190000_102_user_storage_quota.sql](/E:/writing-system/supabase/migrations/20260319190000_102_user_storage_quota.sql) remain unchanged.
2. Local `supabase db reset --yes` succeeds past `073` and `091`.
3. The new contract test proves the replayed local database ends with `public.user_projects` as the only project authority and no surviving `public.projects` relation.
4. The locked flow and extraction foreign keys target `public.user_projects` after replay.
5. The locked flow and extraction policies match the final schema contract after replay.
6. `102` remains unchanged and still bridges either relation name.
7. The locked backend verification suite passes against the replayed local database.
8. If linked-history repair is used, it touches only the exact allowed repair map in this plan.
9. Linked verification and linked contract testing run only after `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `DATABASE_URL` are confirmed present.
10. Task 2's reconciliation migration late-applies cleanly on an already-normalized linked project because every FK, policy, and cleanup step is idempotent.
11. The linked project shows the new reconciliation migrations applied through the repo-defined CLI flow.
12. The contract test passes against the linked database.
13. The verification report exists and records enough evidence for the blocked storage namespace closeout plan to resume from linked-apply verification.

## Completion Criteria

The work is complete only when all of the following are true:

1. The repo no longer depends on editing already-applied historical migration files to get past the `069` rename seam.
2. Local replay is green through `073`, `091`, and `102`.
3. Final replayed schema state matches the currently verified linked-project `public.user_projects` contract.
4. The linked project is either already aligned or repaired only through the locked two-row AGChain settings map before apply.
5. Any unresolved linked-history blocker outside the two-row AGChain settings repair map is treated as a separate recovery problem rather than silently absorbed into this batch.
6. The linked project applies the new reconciliation migrations cleanly.
7. The reconciliation verification report exists and truthfully unblocks the storage namespace closeout plan.
