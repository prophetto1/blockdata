# Pipeline Services Operational Backend Recovery Plan

**Goal:** Make the product backend required by `Pipeline Services / Index Builder` operational end-to-end: the approved frontend design must be able to upload owned markdown sources, persist ordered source sets, queue processing jobs, and retrieve deliverables through the locked `/storage/uploads` and `/pipelines` route family without generic `500 Internal Server Error` failures.

**Architecture:** Treat the approved `Index Builder` design as the authority for visible states and endpoint slots, and keep the product backend on the existing `platform-api` route family: `/storage/uploads` for source ingestion and `/pipelines` for source discovery, source-set persistence, job execution, and deliverable retrieval. Do not introduce admin/runtime probe routes as product dependencies in this tranche. Recover the backend by reconciling the live Supabase schema to the code that is already in the repo, adding a forward-only recovery migration instead of relying on missing out-of-order historical migrations, and hardening the worker and route layer so schema drift fails explicitly instead of crashing the runtime with opaque tracebacks.

**Tech Stack:** FastAPI `services/platform-api`, Supabase Postgres migrations and RPCs, background pipeline worker, React + TypeScript frontend consumer, OpenTelemetry structured backend logs and metrics, pytest.

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| POST | `/storage/uploads` | Reserve a signed upload for one owned source document | Existing - no contract changes |
| POST | `/storage/uploads/{reservation_id}/complete` | Finalize one uploaded source document into `source_documents` | Existing - no contract changes |
| DELETE | `/storage/uploads/{reservation_id}` | Cancel one failed or abandoned upload reservation | Existing - no contract changes |
| GET | `/pipelines/definitions` | Read available pipeline definitions | Existing - no contract changes |
| GET | `/pipelines/{pipeline_kind}/sources` | Read eligible uploaded sources for the selected project | Existing - no contract changes |
| GET | `/pipelines/{pipeline_kind}/source-sets` | Read source-set summaries for the selected project | Existing - preserve success shape; add runtime-schema guard |
| POST | `/pipelines/{pipeline_kind}/source-sets` | Persist a source set for ordered markdown processing | Existing - preserve request and success shape; add runtime-schema guard |
| GET | `/pipelines/{pipeline_kind}/source-sets/{source_set_id}` | Read one source set with ordered items and latest job summary | Existing - preserve success shape; add runtime-schema guard |
| PATCH | `/pipelines/{pipeline_kind}/source-sets/{source_set_id}` | Update source-set label or ordered members | Existing - preserve request and success shape; add runtime-schema guard |
| POST | `/pipelines/{pipeline_kind}/jobs` | Queue a processing job for one source set | Existing - preserve request and success shape; add runtime-schema guard |
| GET | `/pipelines/{pipeline_kind}/jobs/latest` | Read the latest job for one source set | Existing - preserve success shape; add runtime-schema guard |
| GET | `/pipelines/jobs/{job_id}` | Read one full pipeline job record with deliverables | Existing - preserve success shape; add runtime-schema guard |
| GET | `/pipelines/jobs/{job_id}/deliverables` | List deliverables for one pipeline job | Existing - preserve success shape; add runtime-schema guard |
| GET | `/pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download` | Download one deliverable artifact | Existing - preserve success shape; add runtime-schema guard |

#### Modified endpoint contracts

`GET /pipelines/{pipeline_kind}/source-sets`

- Auth: `require_user_auth`
- Request: unchanged query shape, `project_id` required
- Success response: unchanged `{ "items": PipelineSourceSetSummary[] }`
- Touches: `public.pipeline_source_sets`, `public.pipeline_source_set_items`, `public.pipeline_jobs`
- Change: fail fast with deterministic backend-unavailable behavior when the required pipeline runtime schema is absent instead of surfacing a raw PostgREST traceback through a generic `500`

`POST /pipelines/{pipeline_kind}/source-sets`

- Auth: `require_user_auth`
- Request: unchanged `{ project_id, label, source_uids[] }`
- Success response: unchanged `{ "source_set": PipelineSourceSet }`
- Touches: `public.pipeline_source_sets`, `public.pipeline_source_set_items`, `public.source_documents`
- Change: same schema guard behavior as above

`GET /pipelines/{pipeline_kind}/source-sets/{source_set_id}`

- Auth: `require_user_auth`
- Request: unchanged path param only
- Success response: unchanged `{ "source_set": PipelineSourceSet }`
- Touches: `public.pipeline_source_sets`, `public.pipeline_source_set_items`, `public.pipeline_jobs`
- Change: same schema guard behavior as above

`PATCH /pipelines/{pipeline_kind}/source-sets/{source_set_id}`

- Auth: `require_user_auth`
- Request: unchanged optional `label` and `source_uids[]`
- Success response: unchanged `{ "source_set": PipelineSourceSet }`
- Touches: `public.pipeline_source_sets`, `public.pipeline_source_set_items`, `public.source_documents`
- Change: same schema guard behavior as above

`POST /pipelines/{pipeline_kind}/jobs`

- Auth: `require_user_auth`
- Request: unchanged `{ source_set_id }`
- Success response: unchanged `{ "job": PipelineJobSummary }`
- Touches: `public.pipeline_jobs`, worker claim/reap RPCs, pipeline registry
- Change: same schema guard behavior as above

`GET /pipelines/{pipeline_kind}/jobs/latest`

- Auth: `require_user_auth`
- Request: unchanged `source_set_id` query param
- Success response: unchanged `{ "job": PipelineJobSummary | null }`
- Touches: `public.pipeline_jobs`
- Change: same schema guard behavior as above

`GET /pipelines/jobs/{job_id}`

- Auth: `require_user_auth`
- Request: unchanged path param only
- Success response: unchanged `{ "job": PipelineJob }`
- Touches: `public.pipeline_jobs`, `public.pipeline_deliverables`
- Change: same schema guard behavior as above

`GET /pipelines/jobs/{job_id}/deliverables`

- Auth: `require_user_auth`
- Request: unchanged path param only
- Success response: unchanged `{ "items": PipelineDeliverable[] }`
- Touches: `public.pipeline_deliverables`
- Change: same schema guard behavior as above

`GET /pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download`

- Auth: `require_user_auth`
- Request: unchanged path params only
- Success response: unchanged binary download
- Touches: `public.pipeline_deliverables`, `public.storage_objects`, GCS object fetch
- Change: same schema guard behavior as above

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Metric | `platform.pipeline.runtime.schema_not_ready.count` | `services/platform-api/app/observability/pipeline_metrics.py` via route and worker guards | Count backend requests or worker iterations blocked by missing pipeline runtime schema |
| Structured log | `pipeline.runtime.schema_not_ready` | `services/platform-api/app/api/routes/pipelines.py` and `services/platform-api/app/workers/pipeline_jobs.py` | Emit one explicit operator-facing reason when pipeline schema or RPCs are missing instead of leaving only raw traceback spam |

Observability attribute rules:

- Allowed attributes: `pipeline.kind`, `result`, `blocked.surface`, `missing.table_count`, `missing.rpc_count`, `http.status_code`
- Forbidden in trace or metric attributes: `user_id`, `project_id`, `source_uid`, filenames, object keys, signed URLs, raw error payloads from Supabase

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260330233000_pipeline_services_runtime_recovery.sql` | Forward-only recovery migration that recreates or ensures `pipeline_jobs`, `pipeline_deliverables`, `claim_pipeline_jobs`, `reap_stale_pipeline_jobs`, `pipeline_source_sets`, `pipeline_source_set_items`, `pipeline_jobs.source_set_id`, and the source-set backfill/index/fkey contract expected by the current routes and worker | Yes - backfills `source_set_id` and source-set rows for any legacy pipeline job rows that still reference only `source_uid`; otherwise additive |

Migration rule:

- Do not rely on applying the historical missing files `20260327200000_pipeline_jobs_and_deliverables_foundation.sql`, `20260330120000_pipeline_source_sets_foundation.sql`, and `20260330130000_pipeline_source_set_storage_contract.sql` as the operational recovery unit for an environment that already advanced beyond them.
- The recovery migration must fold their required objects forward with idempotent guards so the managed runtime can be repaired without rewriting migration history.

### Edge Functions

Zero edge function changes.

Pipeline processing remains owned by `platform-api`, Supabase Postgres, and the background worker. No edge-function seam is introduced or reused in this recovery.

### Frontend Surface Area

No frontend file edits are authorized in this revision of the plan. The approved `Index Builder` design is still pending and will become the authoritative visible-state contract before implementation begins.

Current connection inventory:

1. `web/src/pages/IndexBuilderPage.tsx`
2. `web/src/pages/IndexBuilderPage.test.tsx`
3. `web/src/lib/pipelineService.ts`
4. `web/src/lib/pipelineSourceSetService.ts`
5. `web/src/pages/usePipelineServicesOverview.ts`

Reference-only exploratory consumers, not authoritative for mounted-product design:

1. `web/src/pages/useIndexBuilderWorkbench.tsx`
2. `web/src/hooks/usePipelineSourceSet.ts`
3. `web/src/hooks/usePipelineJob.ts`
4. `web/src/components/pipelines/PipelineJobStatusPanel.tsx`
5. `web/src/components/pipelines/PipelineDeliverablesPanel.tsx`

## Verified Current Reality

1. The mounted route is `web/src/pages/IndexBuilderPage.tsx`, and that file still contains explicit mock-run scaffolding marked `replace with real API wiring later`.
2. The existing frontend service clients already point at the proper product backend route family: `/storage/uploads`, `/pipelines/definitions`, `/pipelines/{pipeline_kind}/sources`, `GET/POST/PATCH /pipelines/{pipeline_kind}/source-sets`, `POST /pipelines/{pipeline_kind}/jobs`, `GET /pipelines/{pipeline_kind}/jobs/latest`, `GET /pipelines/jobs/{job_id}`, and deliverable list/download endpoints.
3. `web/src/pages/useIndexBuilderWorkbench.tsx` and related pipeline panels are exploratory consumers, not the mounted route, and therefore cannot be treated as authoritative for the approved design contract.
4. The upload path is no longer the primary blocker. The signed-upload control plane writes source uploads through the shared storage seam into `source_documents`, and the pipeline source list route succeeds.
5. The managed runtime database does not currently contain the pipeline processing schema. Live SQL inspection shows:
   - `public.release_expired_storage_reservations()` exists
   - `public.claim_pipeline_jobs(...)` does not exist
   - `public.reap_stale_pipeline_jobs(...)` does not exist
   - no `public.pipeline_%` tables exist
6. The managed migration history stops at `20260327214330_agchain_benchmark_registry`. The live database is missing the local pipeline migrations that the current repo code assumes.
7. `services/platform-api/app/main.py` starts the pipeline worker automatically whenever Supabase credentials exist, so the missing schema is not an isolated route bug. It is a runtime blocker that produces repeating background failures.
8. The current worker fails inside `_reap_stale_pipeline_jobs_sync()` before it can supervise jobs cleanly. The current logs show repeated `PGRST202` / `404 Not Found` failures on `public.reap_stale_pipeline_jobs`.
9. The current frontend can still display a selected source-set label and pending stages from local component state. That display is not proof that the backend source-set or job record exists.
10. The current backend test suite is not sufficient operational proof. The route and worker tests heavily monkeypatch Supabase seams and therefore did not catch the live missing-schema drift.

## Inherited Plan Disposition

1. `docs/plans/2026-03-30-storage-quota-assets-pipeline-services-accounting-implementation-plan.md` remains a storage-accounting plan. It is not the authoritative plan for processing runtime recovery.
2. `docs/plans/2026-03-30-emergency-backend-surface-correction-plan.md` remains the broader contamination and re-certification program. Its `Pipeline Services` track is still useful as context, but it is broader than the immediate requirement here.
3. `web/src/pages/useIndexBuilderWorkbench.tsx` and the related pipeline panel stack remain reference material only until the approved `Index Builder` design is complete. They are not the locked mounted contract for this plan.
4. This plan becomes the authoritative implementation plan for the immediate backend recovery required to make the `Index Builder` product route family operational once the design contract is approved.

## Pre-Implementation Contract

### Locked product decisions

1. The approved `Index Builder` design becomes authoritative for visible states and endpoint slots before implementation begins. The current mock page and exploratory workbench code are reference inputs, not automatic contract sources.
2. The product backend route family is `/storage/uploads` plus `/pipelines`. This correction does not introduce admin/runtime probe routes as required product dependencies.
3. This tranche remains backend-focused. It does not include readiness work, AGChain shell cleanup, or storage-quota layout work.
4. The operational recovery unit is a new forward-only reconciliation migration, not manual reliance on out-of-order historical migration files.
5. The pipeline worker must not hot-loop on missing schema or missing RPCs. It must emit explicit backend-owned diagnostics and back off cleanly until the schema exists.
6. Pipeline upload, source-set, job, and deliverable endpoints must stop surfacing generic raw `500` failures for missing schema. Healthy success responses remain unchanged.
7. The existing upload bridge remains frozen:
   - browser reserve via `/storage/uploads`
   - direct signed upload to GCS
   - completion via `/storage/uploads/{reservation_id}/complete`
   - `source_documents` remains the project source catalog used by `/pipelines/{pipeline_kind}/sources`
8. Jobs remain keyed by `source_set_id`; this plan does not reintroduce `source_uid`-only job orchestration.
9. Deliverables remain stored through `storage_objects` and referenced by `pipeline_deliverables`.

### Locked acceptance contract

1. The managed runtime database contains `pipeline_jobs`, `pipeline_deliverables`, `pipeline_source_sets`, and `pipeline_source_set_items`.
2. The managed runtime database contains `claim_pipeline_jobs(TEXT, INTEGER)` and `reap_stale_pipeline_jobs(INTEGER, INTEGER)`.
3. `POST /storage/uploads` and `POST /storage/uploads/{reservation_id}/complete` continue to produce owned markdown sources that appear in `GET /pipelines/{pipeline_kind}/sources`.
4. `GET /pipelines/{pipeline_kind}/source-sets` no longer returns `500` for a valid authenticated user and project.
5. `POST /pipelines/{pipeline_kind}/source-sets` persists a source set and returns the existing `PipelineSourceSet` success shape.
6. `POST /pipelines/{pipeline_kind}/jobs` queues a job and the worker advances it without repeated stale-reaper RPC failures.
7. `GET /pipelines/{pipeline_kind}/jobs/latest` and `GET /pipelines/jobs/{job_id}` return the current job state for the source set using the existing client contract.
8. `GET /pipelines/jobs/{job_id}/deliverables` and `GET /pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download` work against the same job produced by the approved frontend.
9. When the required schema is missing in any future environment, the backend emits explicit `pipeline.runtime.schema_not_ready` diagnostics instead of opaque route or worker tracebacks.
10. The approved `Index Builder` frontend can be wired to upload, persist source sets, queue processing, observe backend-authoritative job state, and download deliverables using only the locked `/storage/uploads` + `/pipelines` product route family.

## Locked Inventory

### Backend files to add: `3`

1. `supabase/migrations/20260330233000_pipeline_services_runtime_recovery.sql`
2. `services/platform-api/app/services/pipeline_runtime_schema.py`
3. `services/platform-api/tests/test_pipeline_runtime_schema.py`

### Backend files to modify: `7`

1. `services/platform-api/app/api/routes/pipelines.py`
2. `services/platform-api/app/workers/pipeline_jobs.py`
3. `services/platform-api/app/observability/pipeline_metrics.py`
4. `services/platform-api/tests/test_pipelines_routes.py`
5. `services/platform-api/tests/test_pipeline_source_sets_routes.py`
6. `services/platform-api/tests/test_pipeline_worker.py`
7. `services/platform-api/tests/test_storage_routes.py`

### Frontend files to modify: `0`

### Edge functions to add or modify: `0`

## Explicit Risks

1. The managed environment may contain partial legacy pipeline rows from earlier experiments. The recovery migration must backfill idempotently and must not assume a clean zero-row state.
2. If the worker starts between process boot and migration application, a schema guard is required to prevent log spam and misleading operator state.
3. The current test suite mostly mocks database seams. Passing unit tests alone will still be insufficient without a live schema verification step against the managed Supabase project.
4. The source-set contract remains the correct product seam even though the current mounted page is still mock-driven. Any backend recovery that reintroduces `source_uid`-only job semantics without `source_set_id` will break the approved connection model.

## Task Plan

### Task 1: Lock failing tests for runtime-schema drift and preserved pipeline contract

**File(s):**

1. `services/platform-api/tests/test_pipelines_routes.py`
2. `services/platform-api/tests/test_pipeline_source_sets_routes.py`
3. `services/platform-api/tests/test_pipeline_worker.py`
4. `services/platform-api/tests/test_pipeline_runtime_schema.py`
5. `services/platform-api/tests/test_storage_routes.py`

**Step 1:** Add failing route tests that preserve the existing success shapes for storage upload reservation/completion, source discovery, source-set, latest-job, job-detail, and deliverable endpoints.
**Step 2:** Add failing route tests that assert missing pipeline schema produces explicit backend-unavailable behavior rather than a raw generic `500`.
**Step 3:** Add failing worker tests that assert missing schema or missing `reap_stale_pipeline_jobs` does not create a hot error loop and instead emits the locked diagnostic path.

**Test command:** `cd E:\\writing-system\\services\\platform-api && pytest -q tests/test_pipelines_routes.py tests/test_pipeline_source_sets_routes.py tests/test_pipeline_worker.py tests/test_pipeline_runtime_schema.py tests/test_storage_routes.py`
**Expected output:** tests fail because no runtime-schema guard exists and current missing-schema behavior still propagates raw backend failures.

**Commit:** `test: lock pipeline runtime recovery contract`

### Task 2: Add the forward-only pipeline runtime recovery migration

**File(s):**

1. `supabase/migrations/20260330233000_pipeline_services_runtime_recovery.sql`

**Step 1:** Recreate or ensure the missing `pipeline_jobs` and `pipeline_deliverables` tables and the `claim_pipeline_jobs` and `reap_stale_pipeline_jobs` RPCs with the same signatures the current worker calls.
**Step 2:** Recreate or ensure `pipeline_source_sets` and `pipeline_source_set_items`.
**Step 3:** Add or ensure `pipeline_jobs.source_set_id`, the source-set backfill, the final foreign key, and the active-job uniqueness/index contract the current routes expect.
**Step 4:** Keep the migration idempotent and forward-only so it can repair environments that already advanced beyond the older missing migration versions.

**Verification SQL:** confirm that `public.claim_pipeline_jobs`, `public.reap_stale_pipeline_jobs`, and all `public.pipeline_%` tables exist after applying the migration.
**Expected output:** the managed runtime contains the missing pipeline schema objects without rewriting migration history.

**Commit:** `feat: add pipeline runtime recovery migration`

### Task 3: Add backend runtime-schema guards and deterministic diagnostics

**File(s):**

1. `services/platform-api/app/services/pipeline_runtime_schema.py`
2. `services/platform-api/app/api/routes/pipelines.py`
3. `services/platform-api/app/workers/pipeline_jobs.py`
4. `services/platform-api/app/observability/pipeline_metrics.py`

**Step 1:** Add a shared backend helper that verifies the required pipeline tables and RPCs exist.
**Step 2:** Use that helper in pipeline source-set and job routes before touching missing tables.
**Step 3:** Use that helper in the worker supervisor path so a missing schema disables processing cleanly instead of throwing repeated background exceptions.
**Step 4:** Emit the locked metric and structured log when schema readiness fails.

**Test command:** `cd E:\\writing-system\\services\\platform-api && pytest -q tests/test_pipelines_routes.py tests/test_pipeline_source_sets_routes.py tests/test_pipeline_worker.py tests/test_pipeline_runtime_schema.py`
**Expected output:** route and worker tests pass with explicit schema-readiness behavior and preserved success contracts.

**Commit:** `feat: harden pipeline runtime schema readiness`

### Task 4: Re-certify the current pipeline backend against the approved `Index Builder` connection contract

**File(s):**

1. `services/platform-api/tests/test_pipelines_routes.py`
2. `services/platform-api/tests/test_pipeline_source_sets_routes.py`
3. `services/platform-api/tests/test_pipeline_worker.py`
4. `services/platform-api/tests/test_storage_routes.py`

**Step 1:** Verify storage upload reservation/completion still lands owned markdown in `source_documents` and `GET /pipelines/{pipeline_kind}/sources` without a contract change.
**Step 2:** Verify source-set create/list/read/update works with the current `PipelineSourceSet` shape.
**Step 3:** Verify job create, latest-job hydration, worker claim, stage advancement, and deliverable read/download work with the current frontend client shape.
**Step 4:** Verify no repeating `reap_stale_pipeline_jobs` errors remain in the managed runtime logs after the recovery migration and worker guard land.

**Test command:** `cd E:\\writing-system\\services\\platform-api && pytest -q tests/test_pipelines_routes.py tests/test_pipeline_source_sets_routes.py tests/test_pipeline_worker.py tests/test_pipeline_multi_markdown_job.py tests/test_storage_routes.py`
**Expected output:** backend tests pass and the current pipeline route/worker contract is certified against the approved `Index Builder` connection expectations.

**Commit:** `test: recertify pipeline services backend`

### Task 5: Final operational verification against the managed runtime

**Commands:**

1. Verify live migration state and schema objects in the managed Supabase project.
2. Start the local web app against the managed backend target that the approved `Index Builder` frontend will use.
3. Using the approved and wired `Index Builder` frontend, upload one markdown file, persist a source set, start processing, wait for job advancement, and verify deliverables download.

**Expected output:**

1. No `500 Internal Server Error` on `GET/POST /pipelines/{pipeline_kind}/source-sets`
2. No repeating `PGRST202` / `404 Not Found` errors for `reap_stale_pipeline_jobs`
3. The approved processing surface advances beyond the all-`pending` state because a real job record exists and the worker can run it
4. Deliverables can be listed and downloaded from the job the approved frontend created

**Commit:** `test: verify pipeline services runtime recovery`

## Completion Criteria

1. The approved and wired `Index Builder` processing flow works against the managed backend through the locked `/storage/uploads` + `/pipelines` product route family.
2. The managed runtime has the missing pipeline schema and RPCs the repo code already assumes.
3. The worker no longer crashes every iteration on a missing stale-job reaper RPC.
4. Source-set persistence, latest-job hydration, job execution, and deliverable retrieval all work on the same backend contract.
5. The backend emits explicit schema-readiness diagnostics if this drift reappears in another environment.
