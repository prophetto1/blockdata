# User Storage Namespace Remediation and Linked DB Closure Implementation Plan

**Goal:** Close the remaining approval gaps after the initial storage-namespace implementation by validating the immutable storage SQL locally, adding a schema-contract test, applying the reviewed migrations to the linked Supabase project, rerunning final verification from a clean buildable `master` working tree, and recording the manual acceptance evidence required for approval.

**Architecture:** Treat the currently landed storage namespace code as the candidate implementation. This follow-up plan does not redesign storage behavior. It closes proof, deployment, and audit gaps. The existing storage migrations remain immutable and are validated by local replay plus schema-contract testing; the linked database is then advanced through the repo-defined `supabase db push` deploy path. Completion requires a clean `web` build, a linked-project migration state with the storage namespace migrations applied, and recorded manual acceptance evidence for upload, listing, preview/download, delete, and quota behavior.

**Tech Stack:** Supabase CLI, Supabase Postgres migrations, FastAPI, React + TypeScript + Vite, Google Cloud Storage, OpenTelemetry, pytest, Vitest.

**Status:** Draft  
**Author:** Codex  
**Date:** 2026-04-02

## Source of truth

This follow-up plan is derived from:

- `docs/plans/2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md`
- the current post-implementation evaluation findings from the 2026-04-02 `evaluating-implemented-plan` audit
- `.github/workflows/supabase-db-validate.yml`
- `.github/workflows/supabase-db-deploy.yml`
- `.github/workflows/migration-history-hygiene.yml`
- the current storage namespace runtime and test files in `services/platform-api`, `supabase/migrations`, and `web/src`

## Verified current state

### Current implementation evidence

- `cd services/platform-api && pytest -q tests/test_storage_routes.py tests/test_storage_source_documents.py tests/test_storage_download_url.py tests/test_pipelines_routes.py tests/test_pipeline_source_sets_service.py tests/test_pipeline_source_library.py` is currently green with `42 passed`.
- `cd web && npx vitest run src/lib/storageUploadService.test.ts src/lib/pipelineService.test.ts src/lib/projectDetailHelpers.test.ts src/hooks/usePipelineSourceSet.test.ts src/pages/ProjectAssetsPage.test.tsx src/pages/Upload.test.tsx src/components/documents/ParseTabPanel.test.tsx` is currently green with `23 passed`.
- The missing `Upload.test.tsx` drift from the first implementation pass is already closed.

### Remaining approval blockers

- `cd web && npm run build` is not currently green in the shared dirty working tree because unrelated AGChain benchmark edits in `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx` break TypeScript compilation.
- The current storage evaluation therefore cannot honestly claim final build success from the shared working tree.
- The linked Supabase project migration state has not yet been recorded before/after `supabase db push`.
- The checked-in CORS artifact and runbook exist, but live bucket-policy application and the full manual acceptance path have not yet been recorded as evidence.
- The original storage namespace plan now has inventory drift relative to what actually landed, so the plan document needs a closeout update before final re-evaluation.

### Migration guardrails already in force

- Existing migration files are immutable under `.github/workflows/migration-history-hygiene.yml`.
- New migration timestamps must remain unique.
- The repo already defines the validation path as `supabase db reset` in `.github/workflows/supabase-db-validate.yml`.
- The repo already defines the linked-project deploy path as `supabase link --project-ref ...` plus `supabase db push` in `.github/workflows/supabase-db-deploy.yml`.

## Platform API

No new or modified platform API contracts are planned in this follow-up.

This plan verifies the already-landed storage namespace API surface only:

| Verb | Path | Purpose | Status in this follow-up |
| --- | --- | --- | --- |
| `POST` | `/storage/uploads` | Reserve source upload with explicit storage namespace metadata | Verification only |
| `POST` | `/storage/uploads/{reservation_id}/complete` | Finalize source upload and write namespace-aware metadata | Verification only |
| `DELETE` | `/storage/objects/{storage_object_id}` | Delete storage object and reconcile namespace-owned metadata | Verification only |
| `POST` | `/storage/download-url` | Issue signed GCS download URL for owned `users/` locators | Verification only |
| `GET` | `/pipelines/{pipeline_kind}/sources` | List pipeline-owned source inventory | Verification only |
| `POST` | `/pipelines/{pipeline_kind}/source-sets` | Create source set using `pipeline_source_ids` | Verification only |
| `PATCH` | `/pipelines/{pipeline_kind}/source-sets/{source_set_id}` | Update source set using `pipeline_source_ids` | Verification only |

## Observability

No new traces, metrics, or structured logs are planned in this follow-up.

This plan verifies the already-landed observability surfaces that matter to closure:

| Type | Name | Where | Status in this follow-up |
| --- | --- | --- | --- |
| Trace span | `storage.download.sign_url` | `services/platform-api/app/api/routes/storage.py:create_download_url` | Verification only |
| Counter | `platform.storage.download.sign_url.count` | `services/platform-api/app/observability/storage_metrics.py` | Verification only |
| Counter | `platform.storage.download.sign_url.failure.count` | `services/platform-api/app/observability/storage_metrics.py` | Verification only |
| Histogram | `platform.storage.download.sign_url.duration_ms` | `services/platform-api/app/observability/storage_metrics.py` | Verification only |

Observability attribute rules remain unchanged from the approved storage plan and must still be respected during verification.

## Database Migrations

This follow-up plan adds **no new migrations by default**.

It validates and applies the existing storage namespace migration chain:

| Migration | Creates/Alters | Affects Existing Data? |
| --- | --- | --- |
| `20260402193000_storage_namespace_metadata_foundation.sql` | Adds storage namespace columns, checks, indexes, and reservation RPC arguments across `storage_upload_reservations`, `storage_objects`, and `source_documents` | Yes |
| `20260402194000_pipeline_source_registry_and_fk_migration.sql` | Creates `pipeline_sources` and migrates pipeline FK shape to `pipeline_source_id` | Yes |
| `20260402195000_storage_namespace_backfill_and_source_document_reconciliation.sql` | Backfills namespace metadata, reconciles `source_documents`, seeds historical `pipeline_sources`, backfills pipeline rows, and recreates `view_documents` | Yes |

Locked migration rule:

- These three migration files are immutable in this follow-up.
- If local replay or schema-contract verification proves a defect, implementation must stop and a separate additive remediation migration plan must be written.
- Do not edit `20260402193000`, `20260402194000`, or `20260402195000`.

## Edge Functions

No edge functions created or modified.

Existing edge functions remain out of scope for this follow-up. Database validation and linked-project apply stay on the repo’s Supabase DB workflow path.

## Frontend Surface Area

No new or modified frontend runtime files are planned in this follow-up.

The existing frontend runtime surface is verified only:

- `web/src/pages/Upload.tsx`
- `web/src/components/documents/ParseTabPanel.tsx`
- `web/src/pages/ProjectAssetsPage.tsx`
- `web/src/hooks/usePipelineSourceSet.ts`
- `web/src/lib/projectDocuments.ts`
- `web/src/hooks/useProjectDocuments.ts`

If manual acceptance reveals a real frontend defect in those files, stop and write a separate targeted remediation plan instead of improvising runtime changes under this closure plan.

## Supporting Files

This follow-up plan intentionally modifies evidence and plan artifacts:

- `docs/plans/2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md`
- `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`
- `services/platform-api/tests/test_storage_namespace_schema_contract.py`

## Pre-Implementation Contract

No new product, API, data-model, or observability decisions may be improvised during this closure pass. This plan closes verification, migration-application, and audit gaps only. If SQL replay or manual acceptance reveals a real defect, stop and write a separate additive remediation plan before changing runtime code or migration history.

## Locked Product Decisions

1. The storage namespace architecture that landed in the first implementation remains the candidate design. This follow-up does not redesign namespace ownership.
2. The existing storage migration chain is immutable. SQL review happens through replay and contract testing, not by editing historical migration files.
3. Final build evidence must come from local `master` itself, using a clean buildable working tree that excludes unrelated AGChain benchmark breakage. No secondary checkout is part of this plan.
4. The storage task is not complete until the linked Supabase project shows the storage namespace migrations as applied.
5. The storage task is not complete until the Task 8 manual acceptance path is recorded in a verification artifact.
6. Existing runtime code in `services/platform-api` and `web/src` is verification scope, not redesign scope, for this follow-up.
7. If required app origins differ from the checked-in `ops/gcs/user-storage-cors.json`, stop and revise with a dedicated ops/config patch instead of silently changing scope mid-execution.
8. The original storage namespace plan must be updated to reflect the actual landed file inventory and closure evidence before final re-evaluation.

## Locked Acceptance Contract

The storage namespace implementation is only complete when all of the following are true:

1. Local `master`, in a clean storage-scoped working tree, can run `cd web && npm run build` successfully.
2. `cd supabase && supabase db reset` replays the local migration chain successfully, including `20260402193000`, `20260402194000`, and `20260402195000`.
3. `services/platform-api/tests/test_storage_namespace_schema_contract.py` proves the expected namespace schema and view contract after replay.
4. The targeted backend storage test sweep passes against the locally reset schema.
5. The linked Supabase project shows the storage namespace migration chain as applied after `supabase db push`.
6. Assets uploads appear in Assets and not in the Index Builder source list.
7. Pipeline Services uploads appear in Index Builder and not in Assets.
8. Saved Index Builder drafts reopen with stable selected pipeline sources.
9. GCS-backed `users/` locators preview and download successfully.
10. Legacy `uploads/` locators still preview and download successfully.
11. Browser upload no longer fails with raw `Failed to fetch` after the checked-in CORS policy is applied.
12. Deleting one Assets-backed object and one Pipeline Services-backed object removes the correct metadata rows while leaving quota accounting correct.
13. The original storage namespace plan is updated to the actual inventory/evidence state.
14. A fresh `evaluating-implemented-plan` audit returns `Compliant` or `Compliant With Minor Deviations`.

## Locked Platform API Surface

### New endpoints in this follow-up: `0`

### Modified endpoints in this follow-up: `0`

### Existing endpoints verified as-is: `7`

1. `POST /storage/uploads`
2. `POST /storage/uploads/{reservation_id}/complete`
3. `DELETE /storage/objects/{storage_object_id}`
4. `POST /storage/download-url`
5. `GET /pipelines/{pipeline_kind}/sources`
6. `POST /pipelines/{pipeline_kind}/source-sets`
7. `PATCH /pipelines/{pipeline_kind}/source-sets/{source_set_id}`

## Locked Observability Surface

### New observability surfaces in this follow-up: `0`

### Existing observability surfaces verified as-is: `4`

1. `storage.download.sign_url`
2. `platform.storage.download.sign_url.count`
3. `platform.storage.download.sign_url.failure.count`
4. `platform.storage.download.sign_url.duration_ms`

## Locked Inventory Counts

### Runtime code

- New backend runtime files: `0`
- Modified backend runtime files: `0`
- New frontend runtime files: `0`
- Modified frontend runtime files: `0`

### Database

- New migration files: `0`
- Modified existing migration files: `0`

### Tests and documentation

- New backend test files: `1`
- Modified existing backend test files: `0`
- New evidence/report files: `1`
- Modified existing plan files: `1`

## Locked File Inventory

### New files

- `services/platform-api/tests/test_storage_namespace_schema_contract.py`
- `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`

### Modified files

- `docs/plans/2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md`

## Frozen Seam Contract

The storage namespace runtime already crossed the main migration seam. This follow-up must not reopen it casually.

- Do not edit the existing storage namespace migration files. If a migration defect is proven, create a separate additive migration plan.
- Do not treat a dirty shared working tree as acceptable evidence for final build status.
- Do not treat local test success as a substitute for linked-project migration application.
- Do not downscope the manual acceptance path to “tests only.” The bucket CORS apply and cross-surface user flows are part of completion.

## Explicit Risks Accepted In This Plan

1. Unrelated AGChain work may require a temporarily clean working tree on local `master` to produce truthful storage closeout evidence.
2. Linked Supabase project apply requires valid `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `SUPABASE_PROJECT_ID`; without them, the task cannot be called complete.
3. The checked-in CORS file may already be correct; this plan does not invent a config patch unless real origin drift is proven.
4. If linked-project data reveals a backfill issue that local reset did not expose, this closure plan must stop and hand off to a dedicated additive remediation plan.

## Task 1: Prepare a clean verification environment

**File(s):** `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx` (read-only blocker reference)

**Step 1:** Confirm the current `web` build failure comes from unrelated AGChain benchmark edits and not from storage namespace files.
**Step 2:** Stay on local `master` and establish a clean storage-scoped working tree that contains the storage namespace changes without the unrelated AGChain benchmark breakage.
**Step 3:** Run the `web` build once in that clean environment to establish a truthful verification baseline.
**Step 4:** If the build is still blocked by non-storage changes, stop and resolve workspace isolation before continuing.

**Test command:** `cd web && npm run build`
**Expected output:** The clean storage-scoped working tree on `master` builds successfully.

**Commit:** `none - environment isolation only`

## Task 2: Add a storage namespace schema-contract test

**File(s):** `services/platform-api/tests/test_storage_namespace_schema_contract.py`

**Step 1:** Write a schema-contract test that asserts the storage namespace migration chain exposes the required columns, checks, foreign keys, and view columns after replay.
**Step 2:** Assert the contract for `storage_upload_reservations`, `storage_objects`, `source_documents`, `pipeline_sources`, `pipeline_source_set_items.pipeline_source_id`, `pipeline_jobs.pipeline_source_id`, and `view_documents`.
**Step 3:** Assert the `reserve_user_storage` contract includes the namespace arguments introduced by the storage plan.
**Step 4:** Run the new schema-contract test locally after a reset.
**Step 5:** If the schema-contract test fails, stop and write a separate additive migration remediation plan. Do not edit existing migration files.

**Test command:** `cd services/platform-api && pytest -q tests/test_storage_namespace_schema_contract.py`
**Expected output:** `1 passed` (or the full schema-contract module passes with no failures).

**Commit:** `test(storage): add namespace schema contract verification`

## Task 3: Validate the immutable storage migrations locally

**File(s):** `supabase/migrations/20260402193000_storage_namespace_metadata_foundation.sql`, `supabase/migrations/20260402194000_pipeline_source_registry_and_fk_migration.sql`, `supabase/migrations/20260402195000_storage_namespace_backfill_and_source_document_reconciliation.sql`, `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`

**Step 1:** Start the local Supabase environment if it is not already running.
**Step 2:** Replay the entire migration chain from scratch with `supabase db reset`.
**Step 3:** Capture `supabase migration list` immediately after replay.
**Step 4:** Run the new schema-contract test against the reset database.
**Step 5:** Run the targeted backend storage namespace suite against the reset database.
**Step 6:** Record the replay result and local migration state in the verification report.
**Step 7:** If replay, schema verification, or backend tests fail, stop and write a separate additive remediation plan.

**Test command:** `cd supabase && supabase db start && supabase db reset && supabase migration list && cd ../services/platform-api && pytest -q tests/test_storage_namespace_schema_contract.py tests/test_storage_routes.py tests/test_storage_source_documents.py tests/test_storage_download_url.py tests/test_pipelines_routes.py tests/test_pipeline_source_sets_service.py tests/test_pipeline_source_library.py`
**Expected output:** Local reset succeeds, migration list shows the storage namespace chain present, and the backend suite passes.

**Commit:** `docs(storage): record local migration validation evidence`

## Task 4: Apply the reviewed migrations to the linked Supabase project

**File(s):** `.github/workflows/supabase-db-deploy.yml`, `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`

**Step 1:** Confirm `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `SUPABASE_PROJECT_ID` are available for the linked project.
**Step 2:** Run the same CLI sequence defined in `.github/workflows/supabase-db-deploy.yml`.
**Step 3:** Capture `supabase migration list` before `supabase db push`.
**Step 4:** Apply pending migrations with `supabase db push`.
**Step 5:** Capture `supabase migration list` after the push.
**Step 6:** Record the before/after migration state in the verification report.
**Step 7:** If the linked project apply fails, stop and debug the migration application path before continuing.

**Test command:** `cd supabase && supabase link --project-ref $SUPABASE_PROJECT_ID && supabase migration list && supabase db push && supabase migration list`
**Expected output:** The post-push migration list shows the storage namespace migration chain applied with no pending storage namespace migrations.

**Commit:** `docs(storage): record linked db migration application`

## Task 5: Apply the checked-in bucket CORS policy and verify it matches the plan

**File(s):** `ops/gcs/user-storage-cors.json`, `docs/ops/storage-namespace-and-gcs-policy-runbook.md`, `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`

**Step 1:** Compare the required current app origins to the checked-in `ops/gcs/user-storage-cors.json`.
**Step 2:** If the required origins differ from the checked-in file, stop and write a separate tiny ops/config patch plan before continuing.
**Step 3:** Apply the checked-in CORS file to the target bucket using the runbook commands.
**Step 4:** Read the bucket CORS state back after application.
**Step 5:** Record the applied CORS verification in the closure report.

**Test command:** `gcloud storage buckets update gs://YOUR_BUCKET --cors-file=ops/gcs/user-storage-cors.json && gcloud storage buckets describe gs://YOUR_BUCKET --format="default(cors_config)"`
**Expected output:** The described bucket CORS configuration matches the checked-in JSON file.

**Commit:** `docs(storage): record cors application evidence`

## Task 6: Execute the manual acceptance path and record the results

**File(s):** `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`

**Step 1:** Launch the web app and platform API against the linked database with the applied CORS policy.
**Step 2:** Upload a document through Assets and verify it appears in Assets but not in Index Builder.
**Step 3:** Upload a document through Index Builder and verify it appears in Index Builder but not in Assets.
**Step 4:** Save and reopen an Index Builder draft and verify selected pipeline sources remain stable.
**Step 5:** Preview and download a GCS-backed `users/` locator.
**Step 6:** Preview and download a legacy `uploads/` locator.
**Step 7:** Verify browser upload no longer fails with raw `Failed to fetch`.
**Step 8:** Delete one Assets-backed object and one Pipeline Services-backed object and verify the correct metadata rows disappear while quota remains correct.
**Step 9:** Record every pass/fail result and any blocking defect in the verification report.
**Step 10:** If any manual step fails, stop and switch to `comprehensive-systematic-debugging` before making additional code changes.

**Test command:** `manual browser verification against the linked project`
**Expected output:** All manual acceptance steps pass and are recorded in the verification report.

**Commit:** `docs(storage): capture manual namespace closure verification`

## Task 7: Reconcile the original plan, rerun the final verification sweep, and re-audit

**File(s):** `docs/plans/2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md`, `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`, `services/platform-api/tests/test_storage_namespace_schema_contract.py`

**Step 1:** Update the original storage namespace plan so its inventory counts, file inventory, status, and completion evidence match reality.
**Step 2:** Re-run the targeted backend suite, frontend Vitest suite, and clean `web` build.
**Step 3:** Re-run `evaluating-implemented-plan` against the updated original plan plus the closure verification report.
**Step 4:** Only call the storage task complete if the evaluation verdict becomes `Compliant` or `Compliant With Minor Deviations`.

**Test command:** `cd services/platform-api && pytest -q tests/test_storage_namespace_schema_contract.py tests/test_storage_routes.py tests/test_storage_source_documents.py tests/test_storage_download_url.py tests/test_pipelines_routes.py tests/test_pipeline_source_sets_service.py tests/test_pipeline_source_library.py && cd ../../web && npx vitest run src/lib/storageUploadService.test.ts src/lib/pipelineService.test.ts src/lib/projectDetailHelpers.test.ts src/hooks/usePipelineSourceSet.test.ts src/pages/ProjectAssetsPage.test.tsx src/pages/Upload.test.tsx src/components/documents/ParseTabPanel.test.tsx && npm run build`
**Expected output:** All targeted tests pass, the clean `web` build passes, and the re-evaluation returns an approval-grade verdict.

**Commit:** `docs(storage): close namespace remediation audit`

## Completion Criteria

The work is complete only when all of the following are true:

1. The clean storage-scoped working tree on `master` builds successfully.
2. The immutable storage migration chain replays locally with no schema-contract failures.
3. The linked Supabase project shows the storage namespace migrations as applied.
4. The checked-in bucket CORS policy is applied and verified against the target bucket.
5. The full manual acceptance path is recorded and passes.
6. The original storage namespace plan is updated to the actual delivered inventory and evidence state.
7. A fresh `evaluating-implemented-plan` audit returns `Compliant` or `Compliant With Minor Deviations`.
