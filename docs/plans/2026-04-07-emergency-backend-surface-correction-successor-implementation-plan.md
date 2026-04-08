# 2026-04-07 Emergency Backend Surface Correction Master Successor Implementation Plan

**Goal:** Replace the March 30, 2026 emergency correction plan as implementation authority with a current-authority master successor that covers the whole original correction program, updates every original category against the live repo, and phases execution so the program can be completed deliberately instead of pretending the entire correction must land at once.

**Plan Type:** Master successor plan  
**Execution Model:** Full in authority, phased in execution  
**Primary requirement source:** `E:\writing-system\.codex\investigating-and-writing-plan\SKILL.md`

## Source Of Truth

1. This file is the implementation authority for the March 30 emergency correction program.
2. [docs/plans/2026-03-30-emergency-backend-surface-correction-plan.md](E:/writing-system/docs/plans/2026-03-30-emergency-backend-surface-correction-plan.md) remains the record of the original scope and failure pattern, but not the current execution authority.
3. This successor keeps the March 30 program whole, but updates each original track and task as `closed`, `narrowed`, `still open`, `superseded`, or `obsolete`.
4. Later plan families remain background reference where the repo had already moved on, but they are not separate implementation authorities for this correction program. This file absorbs the execution decision for any `Phase 1` through `Phase 4` work it keeps:
   - BlockData/storage background: [2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md](E:/writing-system/docs/plans/blockdata/2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md), [2026-04-03-assets-legacy-document-surface-repair-plan.md](E:/writing-system/docs/plans/blockdata/2026-04-03-assets-legacy-document-surface-repair-plan.md)
   - AGChain background: [2026-04-05-agchain-project-and-admin-model-pages-implementation-plan.md](E:/writing-system/docs/plans/agchain/2026-04-05-agchain-project-and-admin-model-pages-implementation-plan.md), [2026-04-01-agchain-tools-surface-implementation-plan.md](E:/writing-system/docs/plans/agchain/2026-04-01-agchain-tools-surface-implementation-plan.md), [2026-04-01-agchain-models-compliance-remediation-plan.md](E:/writing-system/docs/plans/agchain/2026-04-01-agchain-models-compliance-remediation-plan.md)
   - Supabase and linked-dev background: [2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md](E:/writing-system/docs/plans/supabase/2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md), [2026-04-07-supabase-migration-history-reconciliation-and-agchain-provider-repair-plan.md](E:/writing-system/docs/plans/supabase/2026-04-07-supabase-migration-history-reconciliation-and-agchain-provider-repair-plan.md)

## Revalidated Current State

### Operational Readiness

1. The backend already has a real snapshot seam in [admin_runtime_readiness.py](E:/writing-system/services/platform-api/app/api/routes/admin_runtime_readiness.py) and a richer readiness model in [runtime_readiness.py](E:/writing-system/services/platform-api/app/services/runtime_readiness.py).
2. The frontend is no longer shallow in the old March 30 sense. [SuperuserOperationalReadiness.tsx](E:/writing-system/web/src/pages/superuser/SuperuserOperationalReadiness.tsx) and [OperationalReadinessCheckGrid.tsx](E:/writing-system/web/src/components/superuser/OperationalReadinessCheckGrid.tsx) already render `cause`, `blocked_by`, `available_actions`, `verify_after`, and related detail.
3. The missing seam is not "a readiness page exists" but "the backend-owned executable control plane is incomplete."
4. There is still no [runtime_action_service.py](E:/writing-system/services/platform-api/app/services/runtime_action_service.py), no [runtime_probe_service.py](E:/writing-system/services/platform-api/app/services/runtime_probe_service.py), and no persisted probe/action audit layer.
5. The current readiness service over-advertises backend ownership. Multiple failing checks still mark `actionability="backend_action"` even though no matching executable backend action exists. Only `blockdata.storage.bucket_cors` currently points at a concrete candidate action route: `/admin/runtime/storage/browser-upload-cors/reconcile`.
6. Fresh frontend verification already shows contract drift that `Phase 1` must repair first. [OperationalReadinessCheckGrid.test.tsx](E:/writing-system/web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx) currently fails because its stale assertions no longer match the richer mounted contract.

### Telemetry

1. The backend exposes [telemetry.py](E:/writing-system/services/platform-api/app/api/routes/telemetry.py) and `get_telemetry_status(...)` in [otel.py](E:/writing-system/services/platform-api/app/observability/otel.py).
2. That route is still config-backed, not proof-backed.
3. The frontend visibility gap is real:
   - [ObservabilityTelemetry.tsx](E:/writing-system/web/src/pages/ObservabilityTelemetry.tsx) is static placeholder copy.
   - [ObservabilityTraces.tsx](E:/writing-system/web/src/pages/ObservabilityTraces.tsx) is static placeholder copy.
4. Focused backend testing still produced OTLP export errors after the tests passed, so the March 30 telemetry concern remains real even though instrumentation plumbing exists.

### Pipeline / BlockData

1. Pipeline Services is no longer a fake shell surface. The repo already has real pipeline routes in [pipelines.py](E:/writing-system/services/platform-api/app/api/routes/pipelines.py), real storage behavior in [pipeline_storage.py](E:/writing-system/services/platform-api/app/services/pipeline_storage.py), real worker logic in [pipeline_jobs.py](E:/writing-system/services/platform-api/app/workers/pipeline_jobs.py), and real UI surfaces such as [PipelineServicesPage.tsx](E:/writing-system/web/src/pages/PipelineServicesPage.tsx) and [IndexBuilderPage.tsx](E:/writing-system/web/src/pages/IndexBuilderPage.tsx).
2. The old "shell title regression" concern is no longer the active issue.
3. The remaining correction is operational proof across storage, browser upload, and job execution seams, aligned with the pinned BlockData/storage background set in `Source Of Truth` item 4 rather than the original generic March 30 framing.
4. The checked-in GCS CORS artifact already exists at [user-storage-cors.json](E:/writing-system/ops/gcs/user-storage-cors.json).
5. The mounted Index Builder path now runs through [IndexJobFilesTab.tsx](E:/writing-system/web/src/components/pipelines/IndexJobFilesTab.tsx), [IndexJobRunsTab.tsx](E:/writing-system/web/src/components/pipelines/IndexJobRunsTab.tsx), [IndexJobArtifactsTab.tsx](E:/writing-system/web/src/components/pipelines/IndexJobArtifactsTab.tsx), and [useIndexBuilderJob.ts](E:/writing-system/web/src/hooks/useIndexBuilderJob.ts). The older [PipelineUploadPanel.tsx](E:/writing-system/web/src/components/pipelines/PipelineUploadPanel.tsx), [PipelineSourceSetPanel.tsx](E:/writing-system/web/src/components/pipelines/PipelineSourceSetPanel.tsx), and [PipelineJobStatusPanel.tsx](E:/writing-system/web/src/components/pipelines/PipelineJobStatusPanel.tsx) files still exist, but they are not the mounted Phase 2 surface.

### AGChain

1. AGChain is no longer in the broad contaminated state described on March 30.
2. Several AGChain surfaces are now real and backed:
   - project/workspace routes exist in [agchain_workspaces.py](E:/writing-system/services/platform-api/app/api/routes/agchain_workspaces.py)
   - model/admin/provider surfaces are already under later AGChain plans
3. The remaining March 30 failure pattern is narrower:
   - the main rail in [AgchainLeftNav.tsx](E:/writing-system/web/src/components/agchain/AgchainLeftNav.tsx) still presents stub surfaces with the same visual authority as backed surfaces
   - the overview still depends on placeholder data in [agchainOverviewPlaceholderData.ts](E:/writing-system/web/src/components/agchain/overview/agchainOverviewPlaceholderData.ts)
4. The old "project-registry semantics" task is obsolete in its original form because the repo now has explicit organization/project/workspace handling.

### Documentation / Plan State

1. User direction is explicit: this April 7 successor is the only implementation authority for the correction program. Older plans remain reference only.
2. The March 30 root correction plan still exists as historical record and should be marked superseded in `Phase 4`.
3. The later readiness-control-plane plan in [docs/plans/blockdata/2026-03-30-superuser-operational-readiness-control-plane-implementation-plan.md](E:/writing-system/docs/plans/blockdata/2026-03-30-superuser-operational-readiness-control-plane-implementation-plan.md) still documents useful background work, but it is not separate execution authority for this batch.
4. The April 7 successor is salvageable as the master authority, but its `Phase 1` and `Phase 2` file inventory needed re-locking against the live repo before implementation starts.

## Takeover Revalidation Notes

### Salvage Decision

1. This plan is being salvaged, not rewritten.
2. The phase split, frozen seams, and overall program framing still match the live repo.
3. The required repair is drift correction: fresh verification evidence, updated authority language, and a locked inventory that matches the mounted code instead of older assumptions.

### Fresh Verification Evidence

1. Backend focused verification on `2026-04-07`:
   - command: `cd services/platform-api && pytest -q tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py tests/test_observability.py tests/test_pipelines_routes.py tests/test_pipeline_multi_markdown_job.py`
   - result: `62 passed`
   - retained concern: OTLP export/logging errors still emitted after the suite passed, so telemetry proof remains open even though instrumentation plumbing exists.
2. Frontend focused verification on `2026-04-07`:
   - command: `cd web && npm run test -- src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/pages/PipelineServicesPage.test.tsx src/pages/IndexBuilderPage.test.tsx`
   - result: [PipelineServicesPage.test.tsx](E:/writing-system/web/src/pages/PipelineServicesPage.test.tsx) and [IndexBuilderPage.test.tsx](E:/writing-system/web/src/pages/IndexBuilderPage.test.tsx) passed; [OperationalReadinessCheckGrid.test.tsx](E:/writing-system/web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx) failed in two places because stale assertions no longer match the richer mounted detail contract.

### Locked Drift Findings

1. `Phase 1` must start by re-locking the stale readiness test contract before adding new control-plane behavior.
2. [runtime_readiness.py](E:/writing-system/services/platform-api/app/services/runtime_readiness.py) still over-advertises backend-owned remediation for `blockdata.storage.bucket_config` and `blockdata.storage.signed_url_signing`; `Phase 1` must narrow those checks instead of only adding the `bucket_cors` action.
3. If `Phase 2` keeps a new [admin_runtime_actions.py](E:/writing-system/services/platform-api/app/api/routes/admin_runtime_actions.py) router, [main.py](E:/writing-system/services/platform-api/app/main.py) must be modified to register it.
4. The old pipeline upload/source-set/job-status panels are not the mounted `Phase 2` path. The mounted path is the current Index Builder tabs and hook.
5. [runtime_readiness.py](E:/writing-system/services/platform-api/app/services/runtime_readiness.py) currently reports a false AGChain readiness failure for `agchain.models.targets` because the readiness probe calls [list_model_targets](E:/writing-system/services/platform-api/app/domain/agchain/model_registry.py) with an unsupported `user_id` argument. `Phase 1` must repair this probe so [http://localhost:5374/app/superuser/operational-readiness](http://localhost:5374/app/superuser/operational-readiness) stops misreporting a mounted AGChain seam as broken.

## Phase 0 - Full Revalidation And Disposition

### 0.1 Original March 30 Track Disposition

| Original March 30 Track | Current Status | Successor Treatment | Current Primary Authority |
| --- | --- | --- | --- |
| Operational Readiness control plane | `still open`, but narrowed by already-landed snapshot/UI work | Keep as active work. Execute in `Phase 1`, then continue in `Phase 2` only if broader probe/persistence seams are still justified. | This plan |
| Pipeline Services end-to-end proof | `still open`, but re-scoped | Keep as active work, but align to current BlockData/storage reality. Execute in `Phase 2` with the pinned BlockData/storage background set from `Source Of Truth` item 4 used only as background reference. | This plan |
| AGChain shell decontamination | `narrowed` | Keep as active work, but only for shell/nav truthfulness and overview placeholder removal. Execute in `Phase 3`. | This plan |
| OpenTelemetry proof | `still open`, but narrowed | Split into `Phase 1` visibility and `Phase 2` proof semantics. | This plan |
| Contaminated plan set | `still open` | Execute in `Phase 4` after code changes land. | This plan |

### 0.2 Original March 30 Task Disposition

| March 30 Task | Current Status | Successor Treatment | Phase |
| --- | --- | --- | --- |
| Task 1: Lock failing tests for the new readiness contract | `still open` | Keep. Re-lock the current richer readiness contract and repair stale focused tests. | Phase 1 |
| Task 2: Add readiness audit migrations | `still open`, re-locked | Reintroduce persisted probe/action history as required `Phase 2` infrastructure and lock the concrete migrations in this successor. | Phase 2 |
| Task 3: Build explicit readiness probe and action services | `still open`, narrowed | The concrete action service landed in `Phase 1`. `Phase 2` adds the broader probe service and persisted run model for the remaining backend/control-surface tranche. | Phase 1, then Phase 2 |
| Task 4: Add explicit readiness action routes | `still open`, narrowed | The single concrete route landed in `Phase 1`. `Phase 2` adds detail, verify, and run-lookup routes on top of the persisted run model. | Phase 1, then Phase 2 |
| Task 5: Strengthen telemetry status into proof status | `still open`, narrowed | `Phase 1` made telemetry visible and honest. `Phase 2` must add probe-backed proof semantics without regressing honest config/status labeling. | Phase 1, then Phase 2 |
| Task 6: Expand the readiness frontend into a real control surface | `still open`, narrowed | Wire the real action path into the existing page now. `Phase 2` must add history/detail/probe views and explicit proof coupling on the mounted surface. | Phase 1, then Phase 2 |
| Task 7: Add pipeline-services end-to-end operational probes | `still open`, re-scoped | Keep, but align to the current BlockData/storage seams and certify upload, source-set persistence, job execution, and deliverable download instead of recreating the original generic probe fantasy. | Phase 2 |
| Task 8: Fix pipeline-services shell regression and couple UI to operational proof | `partially closed`, remainder still open | Do not reopen the shell-title issue. Keep the remaining proof-coupling work on the mounted Pipeline Services / Index Builder surfaces. | Phase 2 |
| Task 9: Decontaminate AGChain shell exposure | `still open`, much smaller | Keep as shell/nav truthfulness work only, while preserving the already-real AGChain models/provider/tools surfaces as authoritative. | Phase 3 |
| Task 10: Remove AGChain overview placeholder data or replace it with runtime-backed content | `still open` | Keep, and anchor the distinction between real versus stub surfaces to the current AGChain models/provider/tools/admin reality. | Phase 3 |
| Task 11: Correct AGChain project-registry semantics | `obsolete` | Close. Do not re-implement the March 30 version of this task. The repo has moved on to explicit org/project/workspace seams. | Closed in Phase 0 |
| Task 12: Add runtime-target hardening for local dev | `superseded` | Do not treat as an active implementation batch here. Verify and cross-reference under the linked-dev/schema-parity plan family during program closeout. | Phase 4 verification only |
| Task 13: Invalidate contaminated plans | `still open` | Keep. | Phase 4 |
| Task 14: Final verification pass | `still open` | Keep. | Phase 4 |

## Master Program Scope

This master successor governs the full correction program across five areas:

1. readiness/control-plane truth
2. telemetry truth and visibility
3. pipeline operational certification
4. AGChain shell truthfulness
5. historical plan decontamination and final verification

This master successor does **not** authorize inventing new product domains merely to preserve old March 30 ambition. When the repo has moved on, the plan records that change explicitly and narrows or closes the obsolete work instead of pretending the old design is still the target.

## Pre-Implementation Contract

### Inclusion Boundaries

1. The plan is full authority for the original March 30 correction program.
2. The plan must classify every original March 30 category and task before implementation starts.
3. Phase 1 must be immediately executable without waiting on unresolved Phase 2 architecture.
4. Phase 2 may extend the backend/control-surface only where the need survives Phase 1 verification.
5. Phase 3 is limited to AGChain truthfulness correction, not new AGChain domain implementation.
6. Phase 4 is responsible for documentation closeout, cross-family reconciliation, and full verification.

### Intentional Exclusions

1. No new AGChain domain surfaces beyond truthfulness correction in this program.
2. No new storage/domain architecture that contradicts the pinned BlockData/storage background set in `Source Of Truth` item 4.
3. No new Supabase schema-parity or migration-history program inside this plan; that remains owned by the Supabase plan family.
4. No generic "run arbitrary remediation" endpoint.
5. No false "proof" semantics based only on config presence, route presence, or instrumentation bootstrap.

### Construction Rules

1. Each later phase may execute only the work declared in this master plan.
2. `Phase 2` and `Phase 3` are required tranches of this successor. Any seam removed during detailed prep must be closed explicitly in this plan, not silently skipped.
3. Any reopened March 30 concern must be justified against the live repo, not the original contaminated assumptions.
4. The master plan stays full in authority even if the program is executed one phase at a time.

## Locked Product Decisions

1. The current April 7 file becomes the master successor for the whole March 30 program.
2. `Phase 1` is the immediate executable tranche and should be implemented first.
3. `Phase 2` is the required next tranche after `Phase 1`, not an optional gate.
4. The only guaranteed backend-owned action in `Phase 1` is `storage_browser_upload_cors_reconcile` for `blockdata.storage.bucket_cors`.
5. `Phase 1` telemetry work is honest visibility over the existing status route, not sink-query proof.
6. `Phase 2` includes persisted probe/action history, telemetry proof, and pipeline proof as required implementation work.
7. `Phase 3` is the required AGChain truthfulness tranche and must preserve already-real AGChain models/provider/tools surfaces while decontaminating stub exposure.
8. `Task 11` from March 30 is closed as obsolete.
9. `Task 12` from March 30 is verification-owned under `Phase 4`, not reopened as a new architecture track here.

## Locked Platform API Surface

### Phase 1 Locked Endpoints

| Method | Path | Status In This Plan | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/runtime/readiness` | modified | Keep the current snapshot route, but narrow actionability so it no longer overclaims backend-owned actions. |
| `POST` | `/admin/runtime/storage/browser-upload-cors/reconcile` | new | Apply the checked-in [user-storage-cors.json](E:/writing-system/ops/gcs/user-storage-cors.json) policy to the configured bucket. |
| `GET` | `/observability/telemetry-status` | reused as-is for Phase 1 | Power a real frontend page with explicit config/status labeling. |

### Phase 2 Required Endpoints

These endpoints and proof-coupled route surfaces are part of the required `Phase 2` tranche.

| Method | Path | Phase 2 Purpose |
| --- | --- | --- |
| `GET` | `/admin/runtime/readiness/checks/{check_id}` | readiness drill-in surface backed by persisted probe/action state |
| `POST` | `/admin/runtime/readiness/checks/{check_id}/verify` | explicit backend verification trigger for the mounted readiness control surface |
| `GET` | `/admin/runtime/probe-runs/{probe_run_id}` | read persisted probe history |
| `GET` | `/admin/runtime/action-runs/{action_run_id}` | read persisted action history |
| `POST` | `/admin/runtime/telemetry/export/probe` | execute probe-backed telemetry certification |
| `GET` | `/observability/telemetry-status` | surface latest proof-backed telemetry result while preserving honest config/status visibility |
| `POST` | `/admin/runtime/pipeline-services/browser-upload/probe` | certify the browser-upload path end to end |
| `POST` | `/admin/runtime/pipeline-services/job-execution/probe` | certify pipeline job execution and deliverable generation |
| `GET` | `/pipelines/{pipeline_kind}/source-sets/{source_set_id}` | proof-couple persisted source-set membership to the mounted Index Builder flow |
| `GET` | `/pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download` | proof-couple deliverable availability and download to the mounted Index Builder flow |

Phase 2 pipeline proof also consumes the already-mounted `POST` / `PATCH` source-set routes and the existing job-trigger route. No separate legacy console routes may be invented when the current pipeline pages are already the system of record.

### Phase 2 Endpoint Rules

1. `Phase 2` is the required backend/control-surface continuation of this program.
2. Probe/action persistence is required and must back the run-lookup routes.
3. Pipeline proof must certify four live seams: browser upload, source-set persistence, job execution, and deliverable download.
4. New `Phase 2` routes must attach to the already-mounted readiness, telemetry, and pipeline surfaces rather than resurrecting stand-alone legacy consoles.

## Locked Observability Surface

### Phase 1 Required Observability

1. New span: `runtime.readiness.action.execute`
   - required attributes: `action_id`, `check_id`, `result`
   - failure-only attribute: `error_type`
2. New counter: `runtime_readiness_actions_total`
   - required dimensions: `action_id`, `check_id`, `result`
   - allowed `result` values: `success`, `failure`
3. New histogram: `runtime_readiness_action_duration_ms`
   - required dimensions: `action_id`, `check_id`, `result`
   - allowed `result` values: `success`, `failure`
4. New structured log event: `runtime_readiness_action`
   - required fields: `action_id`, `check_id`, `result`
   - failure-only field: `error_type`
5. Emit locations:
   - the concrete bucket CORS action service
   - the route that invokes it
6. Verification lock:
   - backend tests must assert success and failure logging/metrics behavior where feasible
   - frontend tests must assert honest action affordance and snapshot refresh behavior

### Phase 2 Required Observability

1. New span: `runtime.probe.execute`
   - required attributes: `probe_id`, `surface`, `result`
   - failure-only attribute: `error_type`
2. New counter: `runtime_probes_total`
   - required dimensions: `probe_id`, `surface`, `result`
   - allowed `result` values: `success`, `failure`
3. New histogram: `runtime_probe_duration_ms`
   - required dimensions: `probe_id`, `surface`, `result`
   - allowed `result` values: `success`, `failure`
4. New structured log event: `runtime_probe_run`
   - required fields: `probe_id`, `surface`, `result`
   - failure-only field: `error_type`
5. Minimum required `probe_id` coverage in this phase:
   - `telemetry.export`
   - `pipeline.browser_upload`
   - `pipeline.job_execution`
6. Pipeline proof work must also extend the existing pipeline observability where needed so source-set persistence and deliverable download certification are queryable against the mounted pipeline routes.
7. No `Phase 2` proof UI may claim health unless backed by a matching persisted probe or action run.

## Locked Inventory Counts

### Phase 1 Locked Counts

| Surface | New | Modified |
| --- | --- | --- |
| Backend runtime | `1` | `3` |
| Backend tests | `1` | `3` |
| Frontend runtime | `0` | `5` |
| Frontend tests | `1` | `1` |
| Database / edge functions | `0` | `0` |
| Documentation | `0` | `1` |

### Phase 2 Locked Counts

| Surface | New | Modified |
| --- | --- | --- |
| Backend runtime | `2` | `10` |
| Backend tests | `2` | `5` |
| Frontend runtime | `1` | `13` |
| Frontend tests | `2` | `6` |
| Database migrations | `2` | `0` |
| Documentation | `0` | `1` |

### Phase 3 Locked Counts

| Surface | New | Modified |
| --- | --- | --- |
| Frontend runtime | `0` | `12` |
| Frontend tests | `0` | `6` |
| Backend runtime | `0` | `0` |
| Documentation | `0` | `1` |

### Phase 4 Locked Counts

| Surface | New | Modified |
| --- | --- | --- |
| Documentation | `1` | `3` |
| Runtime code | `0` | `0` by default |

Any runtime-code changes discovered during `Phase 4` verification require a plan addendum instead of being smuggled in as "closeout."

## Locked File Inventory

### Phase 1 Locked File Inventory

**New**

1. [services/platform-api/app/services/runtime_action_service.py](E:/writing-system/services/platform-api/app/services/runtime_action_service.py)
2. [services/platform-api/tests/test_runtime_action_service.py](E:/writing-system/services/platform-api/tests/test_runtime_action_service.py)
3. [web/src/pages/ObservabilityTelemetry.test.tsx](E:/writing-system/web/src/pages/ObservabilityTelemetry.test.tsx)

**Modified**

1. [services/platform-api/app/api/routes/admin_runtime_readiness.py](E:/writing-system/services/platform-api/app/api/routes/admin_runtime_readiness.py)
2. [services/platform-api/app/services/runtime_readiness.py](E:/writing-system/services/platform-api/app/services/runtime_readiness.py)
3. [services/platform-api/app/observability/runtime_readiness_metrics.py](E:/writing-system/services/platform-api/app/observability/runtime_readiness_metrics.py)
4. [services/platform-api/tests/test_admin_runtime_readiness_routes.py](E:/writing-system/services/platform-api/tests/test_admin_runtime_readiness_routes.py)
5. [services/platform-api/tests/test_runtime_readiness_service.py](E:/writing-system/services/platform-api/tests/test_runtime_readiness_service.py)
6. [services/platform-api/tests/test_observability.py](E:/writing-system/services/platform-api/tests/test_observability.py)
7. [web/src/lib/operationalReadiness.ts](E:/writing-system/web/src/lib/operationalReadiness.ts)
8. [web/src/hooks/useOperationalReadiness.ts](E:/writing-system/web/src/hooks/useOperationalReadiness.ts)
9. [web/src/components/superuser/OperationalReadinessCheckGrid.tsx](E:/writing-system/web/src/components/superuser/OperationalReadinessCheckGrid.tsx)
10. [web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx](E:/writing-system/web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx)
11. [web/src/pages/superuser/SuperuserOperationalReadiness.tsx](E:/writing-system/web/src/pages/superuser/SuperuserOperationalReadiness.tsx)
12. [web/src/pages/ObservabilityTelemetry.tsx](E:/writing-system/web/src/pages/ObservabilityTelemetry.tsx)
13. [docs/plans/2026-04-07-emergency-backend-surface-correction-successor-implementation-plan.md](E:/writing-system/docs/plans/2026-04-07-emergency-backend-surface-correction-successor-implementation-plan.md)

### Phase 2 Locked File Inventory

**New database migrations**

1. [supabase/migrations/20260408150000_runtime_probe_runs.sql](E:/writing-system/supabase/migrations/20260408150000_runtime_probe_runs.sql)
2. [supabase/migrations/20260408151000_runtime_action_runs.sql](E:/writing-system/supabase/migrations/20260408151000_runtime_action_runs.sql)

**New**

1. [services/platform-api/app/services/runtime_probe_service.py](E:/writing-system/services/platform-api/app/services/runtime_probe_service.py)
2. [services/platform-api/app/api/routes/admin_runtime_actions.py](E:/writing-system/services/platform-api/app/api/routes/admin_runtime_actions.py)
3. [web/src/components/pipelines/PipelineOperationalProbePanel.tsx](E:/writing-system/web/src/components/pipelines/PipelineOperationalProbePanel.tsx)
4. [services/platform-api/tests/test_runtime_probe_service.py](E:/writing-system/services/platform-api/tests/test_runtime_probe_service.py)
5. [services/platform-api/tests/test_admin_runtime_actions_routes.py](E:/writing-system/services/platform-api/tests/test_admin_runtime_actions_routes.py)
6. [web/src/components/pipelines/PipelineOperationalProbePanel.test.tsx](E:/writing-system/web/src/components/pipelines/PipelineOperationalProbePanel.test.tsx)
7. [web/src/pages/ObservabilityTraces.test.tsx](E:/writing-system/web/src/pages/ObservabilityTraces.test.tsx)

**Modified**

1. [services/platform-api/app/main.py](E:/writing-system/services/platform-api/app/main.py)
2. [services/platform-api/app/api/routes/admin_runtime_readiness.py](E:/writing-system/services/platform-api/app/api/routes/admin_runtime_readiness.py)
3. [services/platform-api/app/api/routes/telemetry.py](E:/writing-system/services/platform-api/app/api/routes/telemetry.py)
4. [services/platform-api/app/api/routes/pipelines.py](E:/writing-system/services/platform-api/app/api/routes/pipelines.py)
5. [services/platform-api/app/services/runtime_readiness.py](E:/writing-system/services/platform-api/app/services/runtime_readiness.py)
6. [services/platform-api/app/services/pipeline_storage.py](E:/writing-system/services/platform-api/app/services/pipeline_storage.py)
7. [services/platform-api/app/workers/pipeline_jobs.py](E:/writing-system/services/platform-api/app/workers/pipeline_jobs.py)
8. [services/platform-api/app/observability/runtime_readiness_metrics.py](E:/writing-system/services/platform-api/app/observability/runtime_readiness_metrics.py)
9. [services/platform-api/app/observability/otel.py](E:/writing-system/services/platform-api/app/observability/otel.py)
10. [services/platform-api/app/observability/pipeline_metrics.py](E:/writing-system/services/platform-api/app/observability/pipeline_metrics.py)
11. [services/platform-api/tests/test_admin_runtime_readiness_routes.py](E:/writing-system/services/platform-api/tests/test_admin_runtime_readiness_routes.py)
12. [services/platform-api/tests/test_runtime_readiness_service.py](E:/writing-system/services/platform-api/tests/test_runtime_readiness_service.py)
13. [services/platform-api/tests/test_observability.py](E:/writing-system/services/platform-api/tests/test_observability.py)
14. [services/platform-api/tests/test_pipelines_routes.py](E:/writing-system/services/platform-api/tests/test_pipelines_routes.py)
15. [services/platform-api/tests/test_pipeline_multi_markdown_job.py](E:/writing-system/services/platform-api/tests/test_pipeline_multi_markdown_job.py)
16. [web/src/lib/operationalReadiness.ts](E:/writing-system/web/src/lib/operationalReadiness.ts)
17. [web/src/hooks/useOperationalReadiness.ts](E:/writing-system/web/src/hooks/useOperationalReadiness.ts)
18. [web/src/pages/superuser/SuperuserOperationalReadiness.tsx](E:/writing-system/web/src/pages/superuser/SuperuserOperationalReadiness.tsx)
19. [web/src/components/superuser/OperationalReadinessCheckGrid.tsx](E:/writing-system/web/src/components/superuser/OperationalReadinessCheckGrid.tsx)
20. [web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx](E:/writing-system/web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx)
21. [web/src/pages/ObservabilityTelemetry.tsx](E:/writing-system/web/src/pages/ObservabilityTelemetry.tsx)
22. [web/src/pages/ObservabilityTelemetry.test.tsx](E:/writing-system/web/src/pages/ObservabilityTelemetry.test.tsx)
23. [web/src/pages/ObservabilityTraces.tsx](E:/writing-system/web/src/pages/ObservabilityTraces.tsx)
24. [web/src/pages/PipelineServicesPage.tsx](E:/writing-system/web/src/pages/PipelineServicesPage.tsx)
25. [web/src/pages/PipelineServicesPage.test.tsx](E:/writing-system/web/src/pages/PipelineServicesPage.test.tsx)
26. [web/src/pages/IndexBuilderPage.tsx](E:/writing-system/web/src/pages/IndexBuilderPage.tsx)
27. [web/src/pages/IndexBuilderPage.test.tsx](E:/writing-system/web/src/pages/IndexBuilderPage.test.tsx)
28. [web/src/components/pipelines/PipelineCatalogPanel.tsx](E:/writing-system/web/src/components/pipelines/PipelineCatalogPanel.tsx)
29. [web/src/components/pipelines/PipelineCatalogPanel.test.tsx](E:/writing-system/web/src/components/pipelines/PipelineCatalogPanel.test.tsx)
30. [web/src/components/pipelines/IndexJobFilesTab.tsx](E:/writing-system/web/src/components/pipelines/IndexJobFilesTab.tsx)
31. [web/src/components/pipelines/IndexJobFilesTab.test.tsx](E:/writing-system/web/src/components/pipelines/IndexJobFilesTab.test.tsx)
32. [web/src/components/pipelines/IndexJobRunsTab.tsx](E:/writing-system/web/src/components/pipelines/IndexJobRunsTab.tsx)
33. [web/src/components/pipelines/IndexJobArtifactsTab.tsx](E:/writing-system/web/src/components/pipelines/IndexJobArtifactsTab.tsx)
34. [web/src/hooks/useIndexBuilderJob.ts](E:/writing-system/web/src/hooks/useIndexBuilderJob.ts)
35. [web/src/lib/pipelineService.ts](E:/writing-system/web/src/lib/pipelineService.ts)
36. [docs/plans/2026-04-07-emergency-backend-surface-correction-successor-implementation-plan.md](E:/writing-system/docs/plans/2026-04-07-emergency-backend-surface-correction-successor-implementation-plan.md)

### Phase 3 Locked File Inventory

**Modified**

1. [web/src/components/agchain/AgchainLeftNav.tsx](E:/writing-system/web/src/components/agchain/AgchainLeftNav.tsx)
2. [web/src/components/agchain/AgchainLeftNav.test.tsx](E:/writing-system/web/src/components/agchain/AgchainLeftNav.test.tsx)
3. [web/src/components/layout/AgchainShellLayout.tsx](E:/writing-system/web/src/components/layout/AgchainShellLayout.tsx)
4. [web/src/components/layout/AgchainShellLayout.test.tsx](E:/writing-system/web/src/components/layout/AgchainShellLayout.test.tsx)
5. [web/src/pages/agchain/AgchainOverviewPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainOverviewPage.tsx)
6. [web/src/pages/agchain/AgchainOverviewPage.test.tsx](E:/writing-system/web/src/pages/agchain/AgchainOverviewPage.test.tsx)
7. [web/src/components/agchain/overview/AgchainOverviewRecentGrid.tsx](E:/writing-system/web/src/components/agchain/overview/AgchainOverviewRecentGrid.tsx)
8. [web/src/components/agchain/overview/AgchainOverviewEvaluationCard.tsx](E:/writing-system/web/src/components/agchain/overview/AgchainOverviewEvaluationCard.tsx)
9. [web/src/components/agchain/overview/AgchainOverviewObservabilityCard.tsx](E:/writing-system/web/src/components/agchain/overview/AgchainOverviewObservabilityCard.tsx)
10. [web/src/components/agchain/overview/agchainOverviewPlaceholderData.ts](E:/writing-system/web/src/components/agchain/overview/agchainOverviewPlaceholderData.ts)
11. [web/src/pages/agchain/AgchainSectionPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainSectionPage.tsx)
12. [web/src/pages/agchain/AgchainSectionPage.test.tsx](E:/writing-system/web/src/pages/agchain/AgchainSectionPage.test.tsx)
13. [web/src/pages/agchain/AgchainPromptsPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainPromptsPage.tsx)
14. [web/src/pages/agchain/AgchainScorersPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainScorersPage.tsx)
15. [web/src/pages/agchain/AgchainParametersPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainParametersPage.tsx)
16. [web/src/pages/agchain/AgchainObservabilityPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainObservabilityPage.tsx)
17. [web/src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx](E:/writing-system/web/src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx)
18. [web/src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx](E:/writing-system/web/src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx)
19. [docs/plans/2026-04-07-emergency-backend-surface-correction-successor-implementation-plan.md](E:/writing-system/docs/plans/2026-04-07-emergency-backend-surface-correction-successor-implementation-plan.md)

### Phase 4 Locked File Inventory

**New**

1. [docs/plans/2026-04-07-emergency-backend-surface-correction-program-verification-report.md](E:/writing-system/docs/plans/2026-04-07-emergency-backend-surface-correction-program-verification-report.md)

**Modified**

1. [docs/plans/2026-03-30-emergency-backend-surface-correction-plan.md](E:/writing-system/docs/plans/2026-03-30-emergency-backend-surface-correction-plan.md)
2. [docs/plans/blockdata/2026-03-30-superuser-operational-readiness-control-plane-implementation-plan.md](E:/writing-system/docs/plans/blockdata/2026-03-30-superuser-operational-readiness-control-plane-implementation-plan.md)
3. [docs/plans/2026-04-07-emergency-backend-surface-correction-successor-implementation-plan.md](E:/writing-system/docs/plans/2026-04-07-emergency-backend-surface-correction-successor-implementation-plan.md)

## Frozen Seam Contract

### Readiness Actionability Seam

1. In `Phase 1`, only `blockdata.storage.bucket_cors` may expose a backend-executable action.
2. In `Phase 1`, checks such as `blockdata.storage.bucket_config` and `blockdata.storage.signed_url_signing` must not continue advertising backend-owned remediation unless a real executable backend action exists.
3. `Phase 1` may narrow actionability to `external_change`, `backend_probe`, or `info_only`, but may not broaden it.
4. `Phase 2` adds broader action/probe seams as a required continuation of this program, but only by attaching them to real executable backend/runtime paths.

### Telemetry Truthfulness Seam

1. `Phase 1` telemetry UI must label the current route as config/status visibility, not export proof.
2. `Phase 2` must promote telemetry to proof-backed status through a real backend probe while preserving the honest config/status layer from `Phase 1`.
3. No page or operator copy may equate "enabled" with "healthy export."

### Pipeline Proof Seam

1. Pipeline work in this program must align with the pinned BlockData/storage background set in `Source Of Truth` item 4.
2. The program must not reopen already-closed shell-title issues just to mimic the March 30 plan literally.
3. Pipeline proof work is about upload, source-set, job-execution, and deliverable seams, not route count.

### AGChain Scope Seam

1. This program does not add new AGChain product domains.
2. `Phase 3` only corrects truthfulness:
   - main rail exposure
   - stub labeling
   - overview placeholder content
3. Already-real AGChain surfaces that `Phase 3` must preserve as authoritative include:
   - `/app/agchain/tools`
   - `/app/agchain/settings/organization/ai-providers`
   - `/app/agchain-admin/models`
4. `/app/agchain-admin/tools` is a separate rebuilding admin surface and is not the main target of this program.
5. The settings sub-rail already has honest `Soon` treatment and is not the main target of this batch.

## Locked Acceptance Contract

1. Every original March 30 track and task is dispositioned explicitly inside this plan.
2. `Phase 1` produces one real backend-owned readiness action, wires it into the existing page, re-locks the current readiness contract, and replaces the telemetry placeholder with a real honest page.
3. `Phase 2` must implement the remaining required backend/control-surface seams: persisted run history, readiness drill-in/verify, telemetry proof, and pipeline proof coupled to the mounted pipeline surfaces.
4. `Phase 3` must leave AGChain shell exposure materially more truthful than it is now while keeping already-real AGChain models/provider/tools surfaces authoritative and distinct from stubs.
5. `Phase 4` must mark the old plans historical/superseded and write a final verification report.

## Explicit Risks

### Risk 1

`Phase 2` is larger than the earlier April 7 gate framing. The main risk is not whether it exists, but whether persistence and proof abstractions drift away from the live telemetry and pipeline seams they are meant to certify.

### Risk 2

Pipeline proof work may require tighter coordination with the pinned BlockData/storage background set in `Source Of Truth` item 4. This plan accepts that cross-family dependency instead of pretending pipeline is standalone.

### Risk 3

Telemetry proof may remain partly unsolved even after Phase 2 if the operator need is stronger than the currently available collector/debug environment. If so, the plan must state that honestly rather than backfilling with config-only language.

### Risk 4

AGChain cleanup may show that some placeholder pages should eventually be hidden instead of merely relabeled. This plan only commits to truthfulness correction, not the final product-information architecture.

## Completion Criteria

1. `Phase 0` is complete when all March 30 tracks and tasks are dispositioned in this file.
2. `Phase 1` is complete when:
   - readiness contract tests reflect the current richer model
   - the bucket CORS action exists and is executable from the page
   - the readiness UI refreshes into truthful post-action state
   - the telemetry page is real and explicitly honest about what the backend route does and does not prove
3. `Phase 2` is complete when persisted run history, readiness drill-in/verify, telemetry proof, and the mounted pipeline proof surfaces are implemented and verified.
4. `Phase 3` is complete when AGChain stub surfaces are unmistakably non-authoritative and the overview no longer depends on deceptive placeholder-backed product framing.
5. `Phase 4` is complete when the older plans are marked historical/superseded and the verification report is written.

## Phased Implementation Plan

### Phase 1 - Immediate Executable Tranche

**Purpose:** Land the highest-confidence correction work that is clearly still needed right now.

**Work included**

1. re-lock the current readiness contract and repair stale focused tests
2. add [runtime_action_service.py](E:/writing-system/services/platform-api/app/services/runtime_action_service.py)
3. add `POST /admin/runtime/storage/browser-upload-cors/reconcile`
4. narrow readiness actionability so the page no longer overclaims backend-owned remediation
5. repair false readiness probe failures where the readiness service is miscalling already-mounted seams, starting with `agchain.models.targets`
6. wire the concrete action into the current readiness page, hook, and grid
7. replace [ObservabilityTelemetry.tsx](E:/writing-system/web/src/pages/ObservabilityTelemetry.tsx) with a real status page backed by `GET /observability/telemetry-status`
8. run focused backend and frontend verification for readiness and telemetry

**Work explicitly excluded**

1. persisted probe/action history
2. generic readiness detail/probe route families
3. telemetry export proof
4. pipeline operational proof
5. AGChain cleanup

**Why Phase 1 goes first**

1. It fixes the most misleading currently exposed seams.
2. It uses the most verified current repo knowledge.
3. It avoids reopening obsolete March 30 architecture just because it was once listed.

### Phase 2 - Remaining Backend / Control-Surface Work

**Purpose:** Implement the remaining viable March 30 backend/control-surface work against the live repo seams, not the original contaminated abstractions.

**Implementation anchors**

1. Readiness drill-in must extend the mounted readiness page rather than create a separate control console.
2. Telemetry proof must build on the honest `Phase 1` status page and replace the traces placeholder with a real proof-backed surface.
3. Pipeline proof must certify the current mounted seams for browser upload, source-set persistence, job execution, and deliverable download.
4. Persistence is part of this tranche because the proof and drill-in surfaces need durable probe/action run records.

**Mounted frontend targets**

1. Readiness work stays anchored on [SuperuserOperationalReadiness.tsx](E:/writing-system/web/src/pages/superuser/SuperuserOperationalReadiness.tsx), [OperationalReadinessCheckGrid.tsx](E:/writing-system/web/src/components/superuser/OperationalReadinessCheckGrid.tsx), [useOperationalReadiness.ts](E:/writing-system/web/src/hooks/useOperationalReadiness.ts), and [operationalReadiness.ts](E:/writing-system/web/src/lib/operationalReadiness.ts).
2. Telemetry proof work anchors on [ObservabilityTelemetry.tsx](E:/writing-system/web/src/pages/ObservabilityTelemetry.tsx) and [ObservabilityTraces.tsx](E:/writing-system/web/src/pages/ObservabilityTraces.tsx).
3. Pipeline proof work anchors on [PipelineServicesPage.tsx](E:/writing-system/web/src/pages/PipelineServicesPage.tsx), [PipelineCatalogPanel.tsx](E:/writing-system/web/src/components/pipelines/PipelineCatalogPanel.tsx), [IndexBuilderPage.tsx](E:/writing-system/web/src/pages/IndexBuilderPage.tsx), [IndexJobFilesTab.tsx](E:/writing-system/web/src/components/pipelines/IndexJobFilesTab.tsx), [IndexJobRunsTab.tsx](E:/writing-system/web/src/components/pipelines/IndexJobRunsTab.tsx), [IndexJobArtifactsTab.tsx](E:/writing-system/web/src/components/pipelines/IndexJobArtifactsTab.tsx), and [useIndexBuilderJob.ts](E:/writing-system/web/src/hooks/useIndexBuilderJob.ts).
4. [PipelineUploadPanel.tsx](E:/writing-system/web/src/components/pipelines/PipelineUploadPanel.tsx), [PipelineSourceSetPanel.tsx](E:/writing-system/web/src/components/pipelines/PipelineSourceSetPanel.tsx), and [PipelineJobStatusPanel.tsx](E:/writing-system/web/src/components/pipelines/PipelineJobStatusPanel.tsx) remain reference-only legacy files unless a later addendum explicitly remounts them.

**Work included**

1. add persisted probe/action run storage and lookup routes
2. add [runtime_probe_service.py](E:/writing-system/services/platform-api/app/services/runtime_probe_service.py) and explicit readiness detail/verify flows
3. add backend-owned telemetry export probing and a proof-backed traces/status frontend surface
4. add backend-owned pipeline browser-upload and job-execution probes
5. couple pipeline proof to the already-mounted source-set persistence and deliverable download seams
6. keep all proof UI on the current mounted pages rather than inventing a second console

**Work explicitly excluded**

1. reopening the closed pipeline shell-title issue
2. inventing a new stand-alone readiness or pipeline operations app
3. adding new product domains beyond the live telemetry, readiness, and pipeline seams already mounted in the repo

### Phase 3 - AGChain Cleanup And Truthfulness Correction

**Purpose:** Finish the still-relevant AGChain portion of the March 30 program without pretending AGChain is still in the same immature state or destabilizing the already-real AGChain models/provider/tools surfaces.

**Work included**

1. distinguish stub surfaces from backed surfaces in the main AGChain rail and shared shell
2. harden [AgchainSectionPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainSectionPage.tsx) so exposed stub pages read unmistakably as stubs
3. remove or sharply demote placeholder-backed overview content
4. keep `/app/agchain/tools`, `/app/agchain/settings/organization/ai-providers`, and `/app/agchain-admin/models` visually and semantically distinct from stubs
5. keep rebuilding surfaces such as `/app/agchain-admin/tools` visibly non-authoritative until their dedicated implementation plans land

**Work excluded**

1. new AGChain domain implementation
2. new AGChain backend families
3. a reopened Task 11 project-registry program
4. admin models or tools feature expansion that belongs to the dedicated AGChain models/tools plan family

### Phase 4 - Hardening, Docs Closeout, Full-Program Verification

**Purpose:** Close the program properly instead of leaving the old plans and assumptions active by inertia.

**Work included**

1. cross-reference later plan families where the repo has already moved on
2. mark the March 30 root correction plan historical/superseded
3. mark the March 30 readiness-control-plane plan historical/superseded
4. verify the runtime-target / linked-dev concern against the current Supabase plan family instead of reopening it blindly
5. write the final verification report

## Recommended Implementation Order

1. Approve this file as the master successor authority for the March 30 program.
2. Implement `Phase 1`.
3. Implement `Phase 2`.
4. Implement `Phase 3` after the backend/control-surface work from `Phase 2` is stable.
5. Finish with `Phase 4`.

## Recommendation

This is the cleanest planning model for the repo as it actually exists now:

1. keep the April 7 salvage and disposition logic, but not the old optional `Phase 2` gate framing
2. keep the "closed / narrowed / still open / superseded / obsolete" reasoning
3. embed that logic into one master successor plan for the whole March 30 correction program
4. execute the program in phases instead of pretending the authority has to be narrow just because execution is phased

The next developer should treat this file as:

1. the full updated authority for the March 30 program
2. a phased program, not a one-shot batch
3. a document that explicitly preserves what is still viable while closing what is no longer real

