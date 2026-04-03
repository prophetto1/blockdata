# Supabase Migration Reconciliation Implementation Plan

**Goal:** Restore a forward-replayable and linked-deployable Supabase migration chain after `20260305120050_069_user_projects_rename.sql` by reconciling the remaining post-rename migrations that still assume a live `public.projects` table, so the blocked storage replay handoff and downstream storage namespace closeout can resume on a truthful schema contract.

**Architecture:** Treat `public.user_projects` as the live project authority after `069`, preserve the already-landed storage parser replay repairs (`20260220193000_storage_parser_compat_bootstrap.sql`, `20260227160000_052_integration_registry_actions.sql`, and `20260303110000_065_service_schema_extensions.sql`) unchanged, and repair only the remaining local migration files that still bind foreign keys or ownership policies to `public.projects` or unqualified `projects` after the rename seam. Validate with local full-chain replay first, then use the repo's normal linked-project `supabase db push` path only after the corrected chain is proven and the connected remote history shows the targeted files are still local-only.

**Tech Stack:** Supabase CLI, Supabase Postgres SQL migrations, Postgres RLS and helper functions, FastAPI runtime verification, pytest.
**Status:** Draft
**Author:** Codex
**Date:** 2026-04-03

## Source Inputs

- `docs/plans/__superseded/2026-04-02-storage-parser-replay-remediation-plan.md`
- `docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md`
- `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`
- `docs/plans/__complete/notes/2026-04-03-supabase-migration-reconciliation-takeover-notes.md`
- `supabase/migrations/20260305120050_069_user_projects_rename.sql`
- `supabase/migrations/20260309183000_073_normalize_flow_identity.sql`
- `supabase/migrations/20260314180000_091_extraction_tables.sql`
- `supabase/migrations/20260319190000_102_user_storage_quota.sql`

## Verified Current State

- The storage-specific replay blockers at `040`, `041`, `042`, `048`, `052`, `065`, and `083` are already cleared by the landed bootstrap and replay-safe repairs.
- Replay now fails at `20260309183000_073_normalize_flow_identity.sql` because the migration assumes `public.projects` still exists after the `069` rename seam.
- `20260314180000_091_extraction_tables.sql` still references `public.projects` and unqualified `projects` in its `project_id` foreign key and RLS ownership checks.
- `20260319190000_102_user_storage_quota.sql` already bridges `public.user_projects` and `public.projects` through `_storage_user_owns_project()` and is verification scope only.
- The previously flagged late-March files now already target `public.user_projects` in the repo and are not part of the remaining edit surface:
  - `20260327200000_pipeline_jobs_and_deliverables_foundation.sql`
  - `20260330120000_pipeline_source_sets_foundation.sql`
  - `20260331141000_agchain_inspect_dataset_registry.sql`
- The connected remote still uses `public.user_projects` as the live authority and does not expose `public.projects` as the active runtime table.

### Platform API

No platform API endpoints are added, removed, or modified in this reconciliation plan.

Existing runtime surfaces are verification-only:

- AGChain workspace endpoints backed by `test_agchain_workspaces.py`
- AGChain dataset endpoints backed by `test_agchain_datasets.py`
- Pipeline source-set and pipeline library routes backed by `test_pipeline_source_sets_routes.py`, `test_pipeline_source_sets_service.py`, `test_pipelines_routes.py`, and `test_pipeline_source_library.py`
- Storage quota and upload routes backed by `test_storage_routes.py`, `test_storage_source_documents.py`, and `test_storage_download_url.py`

### Observability

No new traces, metrics, or structured logs are added in this reconciliation plan.

The zero case is intentional because this work repairs migration-history ownership references instead of adding a new runtime seam.

Observability attribute rules:

- Allowed new attributes: none
- Forbidden additions to trace, metric, or structured-log payloads during this plan:
  - `user_id`
  - `owner_id`
  - `project_id`
  - `source_uid`
  - `object_key`
  - raw SQL text
  - database passwords
  - Supabase access tokens

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260309183000_073_normalize_flow_identity.sql` | Replace all post-`069` references to `public.projects` with `public.user_projects` in flow-table comments, foreign keys, and ownership policies while preserving the existing namespace backfill, uniqueness, and index semantics | No new data rewrite beyond the existing namespace/default updates already in the migration |
| `20260314180000_091_extraction_tables.sql` | Retarget `extraction_schemas.project_id` and the `extraction_schemas_*_own` RLS project-ownership checks from `public.projects` / `projects` to `public.user_projects` | No |
| `20260319190000_102_user_storage_quota.sql` | Verification-only: keep the `_storage_user_owns_project()` bridge unchanged because it already supports either `public.user_projects` or `public.projects` | No contract changes |

Notes:

- `20260305120050_069_user_projects_rename.sql` remains unchanged and is the frozen rename seam this plan builds on.
- The already-landed storage replay repairs in `20260220193000_storage_parser_compat_bootstrap.sql`, `20260227160000_052_integration_registry_actions.sql`, and `20260303110000_065_service_schema_extensions.sql` are preserved as-is and are not edit scope in this plan.
- If connected or otherwise shared migration history proves `073` or `091` has already been applied outside local-only history, stop and write a dedicated additive cutover plan instead of editing those files in place.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

No frontend runtime or component changes.

## Pre-Implementation Contract

No major product, database-seam, API, or rollout decision may be improvised during implementation. If `073` or `091` is discovered to be applied on a shared database, or if replay exposes another post-`069` project-authority break outside the locked file inventory below, implementation must stop and this plan must be revised before any further SQL edits.

### Locked Product Decisions

1. `public.user_projects` is the live project authority after `20260305120050_069_user_projects_rename.sql`; no post-`069` migration may continue treating `public.projects` as the active runtime table.
2. The storage parser bootstrap work that landed in `20260220193000_storage_parser_compat_bootstrap.sql`, `20260227160000_052_integration_registry_actions.sql`, and `20260303110000_065_service_schema_extensions.sql` remains valid prerequisite work and is not to be reworked under this plan.
3. The only migration files in edit scope are `20260309183000_073_normalize_flow_identity.sql` and `20260314180000_091_extraction_tables.sql`.
4. `20260319190000_102_user_storage_quota.sql` stays unchanged because its `_storage_user_owns_project()` helper already bridges both table names correctly.
5. No platform API, observability, edge-function, backend runtime, or frontend redesign is allowed in this plan; runtime code is verification scope only.
6. The preferred path is in-place correction of the local migration files because current evidence shows the connected remote has not applied the remaining broken files.
7. If any shared-environment evidence contradicts that local-only assumption, stop and write a new additive cutover plan instead of improvising a hybrid approach.
8. The April 2 storage parser replay plan becomes a blocked handoff artifact, and the storage namespace closeout plan may not resume until this reconciliation plan proves the upstream chain is truthful again.

### Locked Acceptance Contract

The reconciliation is only complete when all of the following are true:

1. From `E:\writing-system`, `cd supabase && npx supabase db start && npx supabase db reset --yes` replays cleanly past `073` and `091` with no `public.projects` or unqualified `projects` failure after the `069` rename seam.
2. `20260309183000_073_normalize_flow_identity.sql` contains no remaining post-`069` references to `public.projects`.
3. `20260314180000_091_extraction_tables.sql` contains no remaining `public.projects` or unqualified `projects` ownership references.
4. `20260319190000_102_user_storage_quota.sql` still bridges both table names unchanged.
5. `cd services/platform-api && pytest -q tests/test_storage_routes.py tests/test_storage_source_documents.py tests/test_storage_download_url.py tests/test_pipelines_routes.py tests/test_pipeline_source_sets_routes.py tests/test_pipeline_source_sets_service.py tests/test_pipeline_source_library.py tests/test_agchain_workspaces.py tests/test_agchain_datasets.py` passes against the replayed local database.
6. `cd supabase && npx supabase link --project-ref $SUPABASE_PROJECT_ID && npx supabase migration list && npx supabase db push && npx supabase migration list` applies the corrected local history to the linked project with no unresolved drift.
7. The reconciliation verification report records the green replay and linked-apply evidence, and only then the blocked storage closeout plan may resume at Task 3.

### Locked Platform API Surface

No platform API endpoints are added or modified.

Verification-only endpoints/routes:

1. Existing AGChain workspace routes exercised by `test_agchain_workspaces.py`
2. Existing AGChain dataset routes exercised by `test_agchain_datasets.py`
3. Existing storage quota and upload routes exercised by `test_storage_routes.py`, `test_storage_source_documents.py`, and `test_storage_download_url.py`
4. Existing pipeline source-set and pipeline library routes exercised by `test_pipeline_source_sets_routes.py`, `test_pipeline_source_sets_service.py`, `test_pipeline_source_library.py`, and `test_pipelines_routes.py`

### Locked Observability Surface

No new observability surface is introduced.

Allowed new attributes: none.

Forbidden additions in any verification logging for this plan:

1. `user_id`
2. `owner_id`
3. `project_id`
4. `source_uid`
5. raw SQL text
6. Supabase credentials or signed URLs

### Locked Inventory Counts

#### Database

- Modified existing migration files: `2`
- New migration files: `0`

#### Backend

- Modified runtime backend files: `0`

#### Frontend

- Modified frontend files: `0`

#### Tests

- New test modules: `0`
- Modified test modules: `0`
- Verification suites run: `9`

#### Docs

- New verification docs: `1`

### Locked File Inventory

#### New files

- `docs/plans/2026-04-03-supabase-migration-reconciliation-verification-report.md`

#### Modified files

- `supabase/migrations/20260309183000_073_normalize_flow_identity.sql`
- `supabase/migrations/20260314180000_091_extraction_tables.sql`

#### Verification-only files

- `supabase/migrations/20260305120050_069_user_projects_rename.sql`
- `supabase/migrations/20260319190000_102_user_storage_quota.sql`
- `docs/plans/__superseded/2026-04-02-storage-parser-replay-remediation-plan.md`
- `docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md`

## Frozen Project Authority Contract

`20260305120050_069_user_projects_rename.sql` is the rename seam. Before that timestamp, historical migrations may legitimately reference `public.projects`. After that timestamp, new or corrected migrations in this chain must target `public.user_projects` as the live authority.

Do not solve this by recreating `public.projects` after `069`.
Do not add a compatibility view or alias to mask the drift.
Do not reopen the storage parser bootstrap files to paper over post-`069` project-authority mistakes.

## Explicit Risks Accepted In This Plan

1. Current evidence only proves the connected remote has not applied the remaining broken files; if another shared environment has, this plan must stop and hand off to a cutover plan.
2. Local replay may expose another post-`069` `projects` reference later in the chain; if that happens, implementation must stop, record the new failure, and revise the plan instead of silently expanding scope.
3. The linked project may still contain semantic drift beyond the `projects` / `user_projects` seam; linked apply evidence must be captured before the storage closeout plan is resumed.
4. The shared working tree may still contain unrelated application changes; migration verification must rely on the locked SQL files and targeted backend suites rather than on a whole-repo build.

## Task 1: Capture reconciliation takeover evidence

**File(s):** `docs/plans/2026-04-03-supabase-migration-reconciliation-verification-report.md`

**Step 1:** Create `docs/plans/2026-04-03-supabase-migration-reconciliation-verification-report.md`.
**Step 2:** Record the inherited-plan summary: April 2 storage replay work cleared the storage-specific blockers through `065` and now fails at `073`.
**Step 3:** Record the exact remaining post-`069` references found in `073`, `091`, and `102`.
**Step 4:** Record that the late-March pipeline and AGChain migrations already use `public.user_projects` and are no longer edit scope.

**Test command:** `cd supabase && npx supabase migration list && rg -n "public\.projects|FROM projects|REFERENCES projects" migrations/20260309183000_073_normalize_flow_identity.sql migrations/20260314180000_091_extraction_tables.sql migrations/20260319190000_102_user_storage_quota.sql`
**Expected output:** migration history snapshot plus hits only in `073`, `091`, and the fallback branch inside `102`.

**Commit:** `docs(db): capture project-authority reconciliation evidence`

## Task 2: Verify the in-place correction gate

**File(s):** `docs/plans/2026-04-03-supabase-migration-reconciliation-verification-report.md`

**Step 1:** Capture the connected remote migration list before any local SQL edits are treated as deployable.
**Step 2:** Confirm `20260309183000_073_normalize_flow_identity.sql` and `20260314180000_091_extraction_tables.sql` are not applied on the connected project.
**Step 3:** If either timestamp is already applied on a shared database, stop execution immediately.
**Step 4:** In that blocked case, record the evidence and replace this plan with a dedicated additive cutover plan before editing SQL.

**Test command:** `cd supabase && npx supabase link --project-ref $SUPABASE_PROJECT_ID && npx supabase migration list`
**Expected output:** connected history shows `073` and `091` absent from the applied remote set, keeping the preferred in-place correction path valid.

**Commit:** `docs(db): record in-place reconciliation gate`

## Task 3: Repair post-069 flow identity ownership in `073`

**File(s):** `supabase/migrations/20260309183000_073_normalize_flow_identity.sql`

**Step 1:** Replace `COMMENT ON TABLE public.projects` with the equivalent comment on `public.user_projects`.
**Step 2:** Replace both `flow_executions.project_id` and `flow_logs.project_id` foreign-key references from `public.projects(project_id)` to `public.user_projects(project_id)`.
**Step 3:** Replace every `FROM public.projects p` ownership policy reference in the file with `FROM public.user_projects p`.
**Step 4:** Leave the namespace backfill, uniqueness, index, and comment semantics unchanged.

**Test command:** `rg -n "public\.projects|FROM projects|REFERENCES projects" supabase/migrations/20260309183000_073_normalize_flow_identity.sql`
**Expected output:** no matches.

**Commit:** `fix(db): reconcile flow identity migration to user_projects`

## Task 4: Repair extraction schema ownership in `091`

**File(s):** `supabase/migrations/20260314180000_091_extraction_tables.sql`

**Step 1:** Replace `extraction_schemas.project_id` to reference `public.user_projects(project_id)`.
**Step 2:** Replace both `SELECT project_id FROM projects WHERE owner_id = auth.uid()` ownership checks with `SELECT project_id FROM public.user_projects WHERE owner_id = auth.uid()`.
**Step 3:** Leave extraction job tables, indexes, and non-project RLS behavior unchanged.

**Test command:** `rg -n "public\.projects|FROM projects|REFERENCES projects" supabase/migrations/20260314180000_091_extraction_tables.sql`
**Expected output:** no matches.

**Commit:** `fix(db): reconcile extraction schema ownership to user_projects`

## Task 5: Rehearse the full local migration chain

**File(s):** `docs/plans/2026-04-03-supabase-migration-reconciliation-verification-report.md`

**Step 1:** Start the local Supabase environment from `E:\writing-system`.
**Step 2:** Run a full `supabase db reset --yes`.
**Step 3:** Capture `supabase migration list --local`.
**Step 4:** Record whether replay clears `073`, `091`, `102`, and the later storage, pipeline, and AGChain migrations.

**Test command:** `cd supabase && npx supabase db start && npx supabase db reset --yes && npx supabase migration list --local`
**Expected output:** full reset succeeds with no post-`069` `projects`-table failure.

**Commit:** `docs(db): record local reconciliation replay`

## Task 6: Run targeted backend verification

**File(s):** `docs/plans/2026-04-03-supabase-migration-reconciliation-verification-report.md`

**Step 1:** Run the storage route and source-document tests against the reset database.
**Step 2:** Run the pipeline source-set and pipeline library tests against the same database.
**Step 3:** Run the AGChain workspace and dataset tests against the same database.
**Step 4:** Record the pass/fail evidence in the reconciliation verification report.

**Test command:** `cd services/platform-api && pytest -q tests/test_storage_routes.py tests/test_storage_source_documents.py tests/test_storage_download_url.py tests/test_pipelines_routes.py tests/test_pipeline_source_sets_routes.py tests/test_pipeline_source_sets_service.py tests/test_pipeline_source_library.py tests/test_agchain_workspaces.py tests/test_agchain_datasets.py`
**Expected output:** targeted suites pass against the replayed database.

**Commit:** `docs(db): record reconciliation backend verification`

## Task 7: Apply the corrected local history to the linked project

**File(s):** `docs/plans/2026-04-03-supabase-migration-reconciliation-verification-report.md`

**Step 1:** Capture linked migration state before apply.
**Step 2:** Run `npx supabase db push` through the repo's linked-project flow.
**Step 3:** Capture linked migration state after apply.
**Step 4:** Record any drift, partial apply, or stop condition.
**Step 5:** If apply fails after changing linked history, stop and write an additive recovery plan before any retry.

**Test command:** `cd supabase && npx supabase link --project-ref $SUPABASE_PROJECT_ID && npx supabase migration list && npx supabase db push && npx supabase migration list`
**Expected output:** linked project reflects the corrected `073` and `091` history with no unresolved partial-apply state.

**Commit:** `docs(db): record linked reconciliation apply`

## Task 8: Hand the chain back to the storage closeout path

**File(s):** `docs/plans/2026-04-03-supabase-migration-reconciliation-verification-report.md`, `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`

**Step 1:** Record in the reconciliation report that the upstream `public.user_projects` seam is now repaired.
**Step 2:** Update the storage namespace closure verification report with the local replay result that unblocks Task 3.
**Step 3:** Hand off to `docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md` to resume its locked verification path from Task 3.
**Step 4:** Do not mark the storage closeout complete inside this plan.

**Test command:** `cd supabase && npx supabase migration list --local && cd ../services/platform-api && pytest -q tests/test_storage_routes.py tests/test_storage_source_documents.py tests/test_storage_download_url.py`
**Expected output:** local history remains green and the downstream storage closeout plan is unblocked, not completed.

**Commit:** `docs(db): hand off reconciliation success to storage closeout`

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked migration edit surface in this plan remains exactly `073` and `091`.
2. Local replay succeeds with no post-`069` `public.projects` or unqualified `projects` failures.
3. `102` remains unchanged and still bridges either project table correctly.
4. The locked backend verification command is green against the replayed local database.
5. The linked project shows the corrected local-only history applied with no unresolved partial-apply state.
6. The reconciliation verification report exists and records enough evidence for the blocked storage closeout plan to resume from Task 3.
