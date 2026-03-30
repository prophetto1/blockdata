# Pipeline Services Markdown Discussion Packages Implementation Plan

**Goal:** Build the first generic Pipeline Services job flow in `services/platform-api`, with `markdown_index_builder` as the first registered pipeline kind. Inside a dedicated Pipeline Services experience, a user can upload or select a markdown source, manually trigger one pipeline run, and receive two downloadable deliverables: `*.lexical.sqlite` and `*.semantic.zip`, with visible job stages, failure reporting, and no auto-processing on upload.

**Architecture:** Keep `services/platform-api` as the only backend control plane for this feature. The Pipeline Services frontend gets a dedicated markdown-only upload and run surface under the existing top-level Pipeline Services nav area, with a new drill item for the `Index Builder` service at slug `index-builder`. That dedicated upload flow still reuses the existing storage control plane so uploaded markdown lands in the same GCS-backed user-storage bucket, the same `storage_quotas` accounting, and the same `source_documents` bridge as other owned source uploads. Within that shared user storage, phase 1 treats top-level directory prefixes as product surfaces: `assets/` for the Assets surface and `pipeline-services/` for Pipeline Services, with Pipeline Services then branching into level-2 service directories such as `rag/` and `index-builder/`. Pipeline execution becomes a new generic runtime seam: authenticated platform-api endpoints create and read durable `pipeline_jobs`, a platform-api background worker claims queued jobs using a generic claim RPC, dispatches by `pipeline_kind`, and the first registered handler `markdown_index_builder` downloads the owned markdown source from GCS, parses and normalizes it, derives sections and chunks, resolves the embedding model through `model_role_assignments` plus existing user credential flows, writes final `*.lexical.sqlite` and `*.semantic.zip` deliverables into the same GCS-backed user storage, records those objects in `storage_objects` with a new `storage_kind='pipeline'`, and persists deliverable metadata in `pipeline_deliverables`. Temporary intermediate files stay ephemeral in worker-local temp storage and are not persisted as user-visible artifacts in this phase. No Supabase edge functions are created or expanded.

**Tech Stack:** FastAPI, existing platform-api ProcessPoolExecutor/background worker pattern, Supabase Postgres migrations and RLS, GCS user storage, built-in `sqlite3` and `zipfile`, `mistune`, `numpy`, `httpx`, React + TypeScript, existing Workbench patterns, pytest, Vitest, OpenTelemetry.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-27

## Source Documents

- User requirements from this session:
  - manual trigger only
  - backend outputs `*.lexical.sqlite` and `*.semantic.zip`
  - frontend stages: `queued`, `parsing`, `normalizing`, `structuring`, `chunking`, `lexical_indexing`, `embedding`, `packaging`, `complete`, `failed`
  - no auto-processing in this phase
  - no edge-function development, even if an edge function already exists
- User-provided product clarification:
  - “Pipeline Services” is the intended product home for one-click or one-config automated outputs
  - this feature should be the first pipeline instance, not a parse-workbench-only special case
  - the dedicated service UX should not recycle the existing Assets column; it should own a markdown-specific upload and run flow inside Pipeline Services
- Verified codebase references used in this rewrite:
  - `web/src/components/shell/nav-config.ts`
  - `web/src/router.tsx`
  - `services/platform-api/app/api/routes/storage.py`
  - `services/platform-api/app/api/routes/admin_storage.py`
  - `services/platform-api/app/main.py`
  - `services/platform-api/app/api/routes/parse.py`
  - `services/platform-api/tests/test_storage_routes.py`
  - `supabase/migrations/20260319190000_102_user_storage_quota.sql`
  - `supabase/migrations/20260321120000_storage_default_quota_policy.sql`
  - `supabase/migrations/20260228120000_057_model_roles_and_embedding_providers.sql`
- Contradictions found in the inherited draft and corrected here:
  - `/app/rag` exists in nav config but is not mounted in `web/src/router.tsx`
  - the original draft buried the feature in the parse workbench instead of the Pipeline Services area
  - the original draft used markdown-specific tables and routes even though the product direction is now generic pipeline services
  - the original draft used Assets as the primary entry point instead of a dedicated Pipeline Services upload and run surface
  - the original draft mentioned both realtime and polling without locking which one is authoritative for phase 1 status refresh

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/pipelines/definitions` | List registered pipeline kinds and their eligibility metadata | New |
| GET | `/pipelines/{pipeline_kind}/sources` | List owned existing sources eligible for one pipeline kind within one project | New |
| POST | `/pipelines/{pipeline_kind}/jobs` | Create a manual pipeline job for one owned markdown source | New |
| GET | `/pipelines/{pipeline_kind}/jobs/latest` | Read the latest job for one owned source within one pipeline kind | New |
| GET | `/pipelines/jobs/{job_id}` | Read full job state, current stage, failure info, and summary counts | New |
| GET | `/pipelines/jobs/{job_id}/deliverables` | List generated deliverables for a completed pipeline job | New |
| GET | `/pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download` | Download one completed deliverable as a binary response | New |
| POST | `/storage/uploads` | Reserve uploaded source objects, with optional surface/service prefix routing for shared-quota directory placement | Existing - modified |
| POST | `/storage/uploads/{reservation_id}/complete` | Finalize uploaded source objects exactly as today | Existing - no contract changes |

#### New endpoint contracts

`GET /pipelines/definitions`

- Auth: `require_user_auth`
- Request: no body
- Response `200`: `{ "items": [{ "pipeline_kind": string, "label": string, "supports_manual_trigger": true, "eligible_source_types": string[], "deliverable_kinds": string[] }] }`
- Touches: code-defined pipeline registry only

`GET /pipelines/{pipeline_kind}/sources`

- Auth: `require_user_auth`
- Request: query params `project_id` and optional `search`
- Response `200`: `{ "items": [{ "source_uid": string, "project_id": string, "doc_title": string, "source_type": string, "content_type": string | null, "byte_size": int | null, "created_at": string }] }`
- Touches: `public.source_documents`, `public.storage_objects`, pipeline registry
- Behavior:
  - validates `pipeline_kind` against the registry
  - validates project ownership
  - returns only owned sources in the selected project that are compatible with the selected pipeline kind and live under the service-specific Pipeline Services storage prefix in this phase
  - filters to markdown-compatible `source_type` values for `markdown_index_builder`
  - sorts newest-first in this phase

`POST /pipelines/{pipeline_kind}/jobs`

- Auth: `require_user_auth`
- Request: `{ "source_uid": string }`
- Response `202`: `{ "job_id": uuid, "pipeline_kind": string, "source_uid": string, "status": "queued", "stage": "queued" }`
- Touches: `public.pipeline_jobs`, `public.source_documents`, pipeline registry
- Behavior:
  - validates `pipeline_kind` against the registry
  - validates source ownership
  - validates source type is eligible for the selected pipeline kind
  - rejects if an active job already exists for the same `source_uid` and `pipeline_kind`
  - creates a durable queued job; it does not process inline

`GET /pipelines/{pipeline_kind}/jobs/latest`

- Auth: `require_user_auth`
- Request: query param `source_uid`
- Response `200`: `{ "job": null | { "job_id": uuid, "pipeline_kind": string, "source_uid": string, "status": "queued" | "running" | "complete" | "failed", "stage": string, "failure_stage": string | null, "error_message": string | null, "section_count": int | null, "chunk_count": int | null, "embedding_provider": string | null, "embedding_model": string | null, "created_at": string, "started_at": string | null, "claimed_at": string | null, "heartbeat_at": string | null, "completed_at": string | null, "deliverables": [{ "deliverable_kind": string, "filename": string, "content_type": string, "byte_size": int, "created_at": string }] } }`
- Touches: `public.pipeline_jobs`, `public.pipeline_deliverables`
- Behavior:
  - validates `pipeline_kind` against the registry
  - validates source ownership before reading the latest job
  - returns the most recent job for the authenticated user, selected `pipeline_kind`, and selected `source_uid`

`GET /pipelines/jobs/{job_id}`

- Auth: `require_user_auth`
- Request: path param only
- Response `200`: `{ "job": { "job_id": uuid, "pipeline_kind": string, "source_uid": string, "status": "queued" | "running" | "complete" | "failed", "stage": string, "failure_stage": string | null, "error_message": string | null, "section_count": int | null, "chunk_count": int | null, "embedding_provider": string | null, "embedding_model": string | null, "created_at": string, "started_at": string | null, "claimed_at": string | null, "heartbeat_at": string | null, "completed_at": string | null, "deliverables": [{ "deliverable_kind": string, "filename": string, "content_type": string, "byte_size": int, "created_at": string }] } }`
- Touches: `public.pipeline_jobs`, `public.pipeline_deliverables`
- Behavior:
  - validates job ownership by `owner_id`

`GET /pipelines/jobs/{job_id}/deliverables`

- Auth: `require_user_auth`
- Request: path param only
- Response `200`: `{ "items": [{ "deliverable_kind": string, "filename": string, "content_type": string, "byte_size": int, "created_at": string }] }`
- Touches: `public.pipeline_deliverables`
- Behavior:
  - validates job ownership by `owner_id`

`GET /pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download`

- Auth: `require_user_auth`
- Request: path params only
- Response `200`: binary stream with attachment headers
- Touches: `public.pipeline_deliverables`, `public.storage_objects`, GCS user-storage bucket
- Behavior:
  - validates job ownership by `owner_id`
  - validates the requested deliverable belongs to the owned job before reading storage metadata
- `markdown_index_builder` allowed `deliverable_kind` values in this phase:
  - `lexical_sqlite`
  - `semantic_zip`

#### Modified endpoint contracts

`POST /storage/uploads`

- Auth: `require_user_auth`
- Request additions for source uploads: optional `storage_surface` with allowed values `assets` or `pipeline-services`, plus optional `storage_service_slug`
- Response `200`: unchanged
- Touches: `public.storage_upload_reservations`, `public.storage_objects`, `public.source_documents`
- Behavior:
  - keeps the shared user quota model unchanged
  - defaults existing callers to the Assets-compatible top-level prefix when `storage_surface` is omitted
  - requires `storage_service_slug` when `storage_surface='pipeline-services'`
  - allows Pipeline Services uploads to land under `pipeline-services/{service_slug}/...` rather than the generic Assets prefix
  - keeps Assets uploads under the `assets/` top-level prefix
  - does not introduce per-surface quota partitions

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `pipeline.definitions.list` | `services/platform-api/app/api/routes/pipelines.py:list_pipeline_definitions` | Measure registry-list latency |
| Trace span | `pipeline.sources.list` | `services/platform-api/app/api/routes/pipelines.py:list_pipeline_sources` | Measure owned-source list latency and eligibility filtering |
| Trace span | `pipeline.job.create` | `services/platform-api/app/api/routes/pipelines.py:create_pipeline_job` | Measure enqueue latency and validation failures |
| Trace span | `pipeline.job.read` | `services/platform-api/app/api/routes/pipelines.py:get_pipeline_job` | Measure status-read latency |
| Trace span | `pipeline.deliverables.list` | `services/platform-api/app/api/routes/pipelines.py:list_pipeline_deliverables` | Measure deliverable-list latency |
| Trace span | `pipeline.deliverable.download` | `services/platform-api/app/api/routes/pipelines.py:download_pipeline_deliverable` | Measure download latency and missing-deliverable failures |
| Trace span | `pipeline.job.claim` | `services/platform-api/app/workers/pipeline_jobs.py` | Measure claim activity and contention |
| Trace span | `pipeline.job.reap` | `services/platform-api/app/workers/pipeline_jobs.py` | Measure stale-job recovery activity |
| Trace span | `pipeline.job.run` | `services/platform-api/app/workers/pipeline_jobs.py` | Measure end-to-end job duration |
| Trace span | `pipeline.stage.execute` | `services/platform-api/app/pipelines/markdown_index_builder.py` | Measure each stage duration with `pipeline.kind` and `stage` attributes |
| Counter | `platform.pipeline.job.create.count` | route create path | Count create attempts by result and pipeline kind |
| Counter | `platform.pipeline.job.complete.count` | worker completion path | Count completed jobs by pipeline kind |
| Counter | `platform.pipeline.job.failed.count` | worker failure path | Count failed jobs by pipeline kind and failure stage |
| Counter | `platform.pipeline.job.reaped.count` | worker recovery path | Count stale jobs marked failed by recovery reason |
| Counter | `platform.pipeline.deliverable.download.count` | download path | Count deliverable downloads |
| Histogram | `platform.pipeline.job.duration.ms` | worker completion path | Track full job duration |
| Histogram | `platform.pipeline.stage.duration.ms` | pipeline handler stage execution | Track stage-by-stage duration |
| Histogram | `platform.pipeline.chunk.count` | markdown discussion packaging path | Track chunk counts |
| Structured log | `pipeline.job.completed` | worker completion path | Audit pipeline kind, counts, and deliverable kinds without PII |
| Structured log | `pipeline.job.failed` | worker failure path | Audit pipeline kind, failure stage, and sanitized error category |
| Structured log | `pipeline.job.reaped` | worker recovery path | Audit stale-job recovery without raw payloads |

Observability attribute rules:

- Allowed trace/metric attributes: `pipeline.kind`, `stage`, `status`, `result`, `deliverable.kind`, `source.type`, `chunk.count`, `section.count`, `http.status_code`, `embedding.provider`, `embedding.model`, `has_project_id`, `recovery.reason`
- Forbidden in trace or metric attributes: `user_id`, `job_id`, `source_uid`, raw filenames, document titles, storage object keys, signed URLs, raw markdown, raw error payloads
- Structured logs are also sanitized in this phase; they must not include raw markdown, source titles, object keys, signed URLs, or user identifiers

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260327200000_pipeline_jobs_and_deliverables_foundation.sql` | Creates `pipeline_jobs` and `pipeline_deliverables`, locks lifecycle/status vs stage fields, adds claim/recovery SQL paths plus RLS/indexes, and broadens `storage_objects.storage_kind` to include `pipeline` | No |

### Edge Functions

No edge functions created or modified.

Existing Supabase edge functions are explicit non-targets for this implementation. They may be read for historical context only.

### Frontend Surface Area

**New pages:** `1`

| Page | File | Purpose |
|------|------|---------|
| `PipelineServicesPage` | `web/src/pages/PipelineServicesPage.tsx` | Pipeline Services product surface mounted at `/app/rag` |

**New components:** `4`

| Component | File | Used by |
|-----------|------|---------|
| `PipelineCatalogPanel` | `web/src/components/pipelines/PipelineCatalogPanel.tsx` | `PipelineServicesPage.tsx` as the landing/service chooser; in phase 1 it renders the `Index Builder` service entry |
| `PipelineUploadPanel` | `web/src/components/pipelines/PipelineUploadPanel.tsx` | `usePipelineServicesWorkbench.tsx` for markdown upload plus existing-source selection |
| `PipelineJobStatusPanel` | `web/src/components/pipelines/PipelineJobStatusPanel.tsx` | `usePipelineServicesWorkbench.tsx` |
| `PipelineDeliverablesPanel` | `web/src/components/pipelines/PipelineDeliverablesPanel.tsx` | `usePipelineServicesWorkbench.tsx` |

**New hooks:** `1`

| Hook | File | Used by |
|------|------|---------|
| `usePipelineJob` | `web/src/hooks/usePipelineJob.ts` | `usePipelineServicesWorkbench.tsx` |

**New libraries/services:** `1`

| Library | File | Purpose |
|---------|------|---------|
| `pipelineService` | `web/src/lib/pipelineService.ts` | Platform-api calls for definitions, owned source listing, trigger, latest job, job detail, deliverables, and download |

**New supporting page/workbench files:** `1`

- `web/src/pages/usePipelineServicesWorkbench.tsx`

**Modified pages:** `0`

**Modified components:** `1`

| Component | File | What changes |
|-----------|------|--------------|
| `Pipeline nav config` | `web/src/components/shell/nav-config.ts` | Keep `/app/rag` as the Pipeline Services path, but stop presenting it as a pure RAG-only concept |

**Modified hooks/services:** `0`

**Other supporting files:** `2`

- `web/src/router.tsx`
- `web/src/lib/platformApi.ts` read-only reference only; no contract change planned

## Higher-Rigor Locking For Multi-System Work

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The generic framework is built now: `pipeline_jobs` and `pipeline_deliverables` are shared infrastructure, with `pipeline_kind='markdown_index_builder'` as the first registered kind.
2. No Supabase edge function is created or expanded. The full runtime seam is `services/platform-api` plus Postgres and GCS.
3. Upload remains separate from processing. Uploading a markdown file must not auto-create or auto-run a pipeline job in this phase.
4. The primary user-facing surface is Pipeline Services at `/app/rag`, not the parse workbench. The parse workbench remains focused on parse/extract concerns.
5. The primary interaction model is a dedicated Pipeline Services upload and run flow for the `Index Builder` service, mounted under a new drill item inside the existing Pipeline Services nav group. Reusing the Assets column as the main UX is out of scope for this phase.
6. Deliverables are tracked in `storage_objects` with `storage_kind='pipeline'` and in `pipeline_deliverables`; they do not live in `conversion_representations`.
7. The markdown-discussion pipeline resolves embeddings from `model_role_assignments` where `role_key='embedding'`, ordered by priority, using the user’s existing provider/API-key connections. If no usable credential exists, the job fails at `embedding`.
8. The chunking contract for `markdown_index_builder` targets roughly `512` tokens per chunk, respects section boundaries, and may allow a chunk to grow to roughly `1024` tokens before splitting to avoid pathological mid-section fragmentation.
9. Phase 1 frontend job refresh is polling-authoritative. Realtime subscriptions are not required for correctness in this phase.
10. The nav path `/app/rag` remains unchanged in this phase even though the page becomes a generic Pipeline Services surface. Route cleanup or renaming is deferred.
11. Phase 1 uses one shared per-user storage quota pool across Assets, Pipeline Services, and other owned upload surfaces. There is no hard quota partition such as “2 GB for pipelines, 3 GB for assets” in this phase.
12. Generic job lifecycle and kind-specific stage labels are separate concepts in this plan: `status` is lifecycle-level (`queued`, `running`, `complete`, `failed`), while `stage` is pipeline-kind-specific progress (`parsing`, `chunking`, `embedding`, etc.).

### Locked Storage Contract

1. The dedicated Pipeline Services upload UI reuses `POST /storage/uploads` and `POST /storage/uploads/{reservation_id}/complete` under the hood; it does not create a second upload backend.
2. Uploaded markdown sources for `markdown_index_builder` are durable user-storage objects in the same GCS bucket and the same per-user quota system as other owned uploads. They use `storage_kind='source'` and still bridge into `source_documents`.
3. Final pipeline deliverables are also durable user-storage objects in the same bucket and quota system. They use `storage_kind='pipeline'` and are attached to `pipeline_deliverables`.
4. The worker must reserve and finalize durable deliverable uploads through the same quota-accounting model before and after writing final artifacts, rather than bypassing `storage_objects`.
5. Intermediate files created during parsing, chunking, SQLite building, or embedding assembly stay in worker-local temp storage only. They are deleted at job end, are not persisted to GCS, and do not count against user quota in this phase.
6. Separation between Assets-origin and Pipeline Services-origin files is directory-level and metadata-level only in this phase. It is not a separate quota ledger.
7. The intended directory model is user-global storage with product-surface folders, conceptually like:
   - `user-id-storage/assets/...`
   - `user-id-storage/pipeline-services/rag/...`
   - `user-id-storage/pipeline-services/<service-name>/...`
8. The locked object-key examples for this phase are:
   - Assets source upload: `users/{user_id}/assets/projects/{project_id}/sources/{source_uid}/source/{filename}`
   - Pipeline Services source upload: `users/{user_id}/pipeline-services/{service_slug}/projects/{project_id}/sources/{source_uid}/source/{filename}`
   - Pipeline Services deliverable: `users/{user_id}/pipeline-services/{service_slug}/projects/{project_id}/sources/{source_uid}/jobs/{job_id}/asset.lexical.sqlite`
   - Pipeline Services deliverable: `users/{user_id}/pipeline-services/{service_slug}/projects/{project_id}/sources/{source_uid}/jobs/{job_id}/asset.semantic.zip`
9. Pipeline Services files may use their own object-key prefixes and source-list filtering rules, but they still draw from the same shared user quota pool.

### Locked Source Selection Contract

1. The `Index Builder` service must support both uploading a new markdown source and selecting an existing owned markdown source from inside Pipeline Services.
2. Existing-source selection is powered by `GET /pipelines/{pipeline_kind}/sources`, not by reusing the Assets column as the primary interaction surface.
3. In phase 1, that source list is filtered to owned sources in the selected project that are compatible with `markdown_index_builder` and live under the `index-builder` Pipeline Services storage prefix.
4. A successful markdown upload from the `Index Builder` surface must immediately refresh the same source list and select the new source without auto-starting a job.

### Locked Refresh Contract

1. The Pipeline Services frontend uses polling as the authoritative job-refresh mechanism in this phase.
2. After a user creates a job or opens a selected source with a non-terminal latest job, the client polls `GET /pipelines/jobs/{job_id}` every `2` seconds until the job reaches `complete` or `failed`, then stops automatically.
3. `GET /pipelines/{pipeline_kind}/jobs/latest` is used once per selected source to hydrate the current/latest job before polling begins.
4. No frontend realtime subscription is required for phase-1 correctness. If table publication entries are added later, they are supplemental only and must not be required for status visibility.

### Locked Embedding Execution Contract

1. Provider candidates are resolved from `model_role_assignments` where `role_key='embedding'`, ordered by `priority ASC`.
2. Provider selection happens once at the start of the `embedding` stage. Providers without a usable user credential are skipped during selection.
3. Once a provider/model pair is selected for a job, it remains fixed for that job. The worker must not mix embeddings from multiple providers in one `*.semantic.zip`.
4. Embedding requests are batched at a maximum of `64` chunks or `250000` UTF-8 bytes per request, whichever comes first.
5. Retry/backoff applies only to transient failures: network errors, `408`, `429`, and `5xx`. Use up to `5` total attempts per batch with exponential backoff starting at `1s`, doubling each attempt, capped at `16s`, plus jitter.
6. Non-transient provider errors such as `400`, `401`, `403`, malformed provider responses, or unsupported-model responses fail the stage immediately.
7. If any batch fails terminally after the embedding stage has started, the worker discards all temporary embedding output for that job, uploads no semantic deliverable, and marks the job `failed` with `failure_stage='embedding'`. The recovery path is a new manual rerun.

### Locked Worker Runtime Contract

1. `POST /pipelines/{pipeline_kind}/jobs` only validates and inserts a queued row. It never performs parse, chunk, lexical, or embedding work inline on the request path.
2. The platform-api process hosts a background pipeline supervisor during app lifespan. The supervisor uses a shared `ProcessPoolExecutor` for pipeline execution so CPU-heavy stages stay off the async request loop.
3. The claim topology is generic and multi-kind: one supervisor loop iterates registered pipeline kinds round-robin, calls `claim_pipeline_jobs(p_pipeline_kind, p_limit=1)` per kind while worker capacity remains, and submits claimed jobs to the shared pool. Phase 1 keeps per-kind concurrency at `1` unless a later plan changes it.
4. A claimed `markdown_index_builder` job fetches owned source metadata from `source_documents` plus `storage_objects`, downloads the markdown bytes directly from GCS using server credentials, validates the source before processing, and runs parse, normalize, structure, chunk, lexical-index, embedding, and packaging inside the worker process.
5. CPU-heavy work such as markdown normalization, section derivation, chunking, SQLite creation, and NumPy array assembly stays entirely inside the worker process. It does not run on the FastAPI event loop.
6. Embedding HTTP calls also run from inside the worker process rather than the request loop. They may be network-bound, but they are still outside the async API path.

### Locked Recovery Contract

1. `pipeline_jobs` stores both `claimed_at` and `heartbeat_at` for stale-job recovery.
2. The worker sets `status='running'`, `claimed_at`, and `heartbeat_at` when a queued job is claimed.
3. The worker refreshes `heartbeat_at` before each stage transition and after each embedding batch.
4. A periodic recovery sweep runs inside the pipeline supervisor at least once per minute.
5. Any running job whose `heartbeat_at` is older than `15` minutes is marked `failed` by the reaper, with `failure_stage` set to its last known `stage` and a sanitized stale-job error message.
6. Stale-job recovery is the mechanism that handles app restarts, worker crashes, or orphaned non-terminal jobs in this phase. User-facing cancel/retry controls are deferred.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. A user uploads a markdown asset from the dedicated `Index Builder` Pipeline Services surface, using the existing storage upload backend under the hood, and it appears in `source_documents`.
2. The uploaded markdown source counts against the same user-storage quota as other owned source files.
3. From the `Index Builder` Pipeline Services surface, the user can manually trigger the pipeline for an owned markdown source.
4. The user can browse and select existing owned markdown sources from the `Index Builder` service without leaving Pipeline Services.
5. The triggered job progresses through lifecycle `status` values `queued -> running -> complete|failed` while `stage` advances through `queued`, `parsing`, `normalizing`, `structuring`, `chunking`, `lexical_indexing`, `embedding`, and `packaging`.
6. On completion, Pipeline Services shows two downloadable deliverables for the job: one `*.lexical.sqlite` and one `*.semantic.zip`.
7. The lexical package contains `document`, `sections`, `chunks`, `chunks_fts`, and `manifest`.
8. The semantic package contains `manifest.json`, `chunks.jsonl`, `embeddings.npy`, and chunk-id mapping metadata.
9. If the user has no usable embedding credential, the job ends in `failed`, the failure stage is `embedding`, and the failure message is visible.
10. Final deliverables count against the same user-storage quota as the uploaded markdown source, while temporary intermediate files do not persist as quota-counted objects.
11. Opening the Pipeline Services nav item at `/app/rag` shows a real page and exposes a drill item for the `Index Builder` service.
12. Uploading a markdown file without clicking the manual run action does not enqueue or start a pipeline job.
13. A running job abandoned by restart or worker death is marked `failed` by stale-job recovery within the locked TTL window rather than remaining stranded forever.
14. No phase-1 API or schema introduces hard per-surface storage sub-quotas for Assets versus Pipeline Services.

### Locked Platform API Surface

#### New authenticated pipeline endpoints: `7`

1. `GET /pipelines/definitions`
2. `GET /pipelines/{pipeline_kind}/sources`
3. `POST /pipelines/{pipeline_kind}/jobs`
4. `GET /pipelines/{pipeline_kind}/jobs/latest`
5. `GET /pipelines/jobs/{job_id}`
6. `GET /pipelines/jobs/{job_id}/deliverables`
7. `GET /pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download`

#### Modified existing platform-api endpoints: `1`

1. `POST /storage/uploads`

#### Existing platform-api endpoints reused as-is: `1`

1. `POST /storage/uploads/{reservation_id}/complete`

### Locked Observability Surface

#### New traces: `10`

1. `pipeline.definitions.list`
2. `pipeline.sources.list`
3. `pipeline.job.create`
4. `pipeline.job.read`
5. `pipeline.deliverables.list`
6. `pipeline.deliverable.download`
7. `pipeline.job.claim`
8. `pipeline.job.reap`
9. `pipeline.job.run`
10. `pipeline.stage.execute`

#### New metrics: `5 counters`, `3 histograms`

1. `platform.pipeline.job.create.count`
2. `platform.pipeline.job.complete.count`
3. `platform.pipeline.job.failed.count`
4. `platform.pipeline.job.reaped.count`
5. `platform.pipeline.deliverable.download.count`
6. `platform.pipeline.job.duration.ms`
7. `platform.pipeline.stage.duration.ms`
8. `platform.pipeline.chunk.count`

#### New structured logs: `3`

1. `pipeline.job.completed`
2. `pipeline.job.failed`
3. `pipeline.job.reaped`

### Locked Inventory Counts

#### Database

- New migrations: `1`
- Modified existing migrations: `0`

#### Backend

- New route modules: `1`
- New pipeline/worker/service modules: `5`
- New observability modules: `1`
- Modified existing backend modules: `4`

#### Frontend

- New top-level pages/routes: `1`
- New visual components: `4`
- New hooks/services: `2`
- Modified existing frontend files: `2`

#### Tests

- New pytest modules: `4`
- Modified pytest modules: `1`
- New Vitest modules: `6`

### Locked File Inventory

#### New backend files

- `services/platform-api/app/api/routes/pipelines.py`
- `services/platform-api/app/pipelines/registry.py`
- `services/platform-api/app/pipelines/markdown_index_builder.py`
- `services/platform-api/app/services/pipeline_storage.py`
- `services/platform-api/app/services/pipeline_embeddings.py`
- `services/platform-api/app/workers/pipeline_jobs.py`
- `services/platform-api/app/observability/pipeline_metrics.py`
- `services/platform-api/tests/test_pipelines_routes.py`
- `services/platform-api/tests/test_pipeline_registry.py`
- `services/platform-api/tests/test_markdown_index_builder_pipeline.py`
- `services/platform-api/tests/test_pipeline_worker.py`

#### Modified backend files

- `services/platform-api/app/api/routes/storage.py`
- `services/platform-api/app/main.py`
- `services/platform-api/app/observability/contract.py`
- `services/platform-api/requirements.txt`

#### Modified backend test files

- `services/platform-api/tests/test_storage_routes.py`

#### New database files

- `supabase/migrations/20260327200000_pipeline_jobs_and_deliverables_foundation.sql`

#### New frontend files

- `web/src/pages/PipelineServicesPage.tsx`
- `web/src/pages/usePipelineServicesWorkbench.tsx`
- `web/src/components/pipelines/PipelineCatalogPanel.tsx`
- `web/src/components/pipelines/PipelineUploadPanel.tsx`
- `web/src/components/pipelines/PipelineJobStatusPanel.tsx`
- `web/src/components/pipelines/PipelineDeliverablesPanel.tsx`
- `web/src/hooks/usePipelineJob.ts`
- `web/src/lib/pipelineService.ts`
- `web/src/lib/pipelineService.test.ts`
- `web/src/hooks/usePipelineJob.test.ts`
- `web/src/components/pipelines/PipelineCatalogPanel.test.tsx`
- `web/src/components/pipelines/PipelineUploadPanel.test.tsx`
- `web/src/components/pipelines/PipelineJobStatusPanel.test.tsx`
- `web/src/components/pipelines/PipelineDeliverablesPanel.test.tsx`

#### Modified frontend files

- `web/src/router.tsx`
- `web/src/components/shell/nav-config.ts`

## Frozen Pipeline Framework Contract

This feature is no longer a markdown-only special table stack. The generic framework contract is:

- `pipeline_jobs` is the durable job table for current and future pipeline kinds.
- `pipeline_deliverables` is the durable metadata table for current and future pipeline output files.
- `pipeline_kind='markdown_index_builder'` is the first registered kind in this phase.
- `pipeline_jobs.status` is lifecycle-only in this phase: `queued`, `running`, `complete`, `failed`.
- `pipeline_jobs.stage` is the current pipeline-kind-specific stage label and may differ across future pipeline kinds.
- `source_documents.status` is not reused for pipeline stage tracking.
- `storage_objects` is the authoritative byte-accounting record for deliverables, using `storage_kind='pipeline'`.
- Quota accounting remains user-global in this phase; path prefixes and object metadata distinguish product surfaces, but quota enforcement does not split by surface.
- Product-surface hierarchy is part of the path design in this phase: Assets and Pipeline Services occupy different top-level prefixes inside the user-owned storage tree, and Pipeline Services may introduce level-2 service prefixes such as `rag/` and `index-builder/`.
- Pipeline Services source uploads for the `index-builder` surface follow a service-specific prefix under `pipeline-services/`, while Assets-origin uploads remain under `assets/`.
- Source upload object keys follow these locked shapes:
  - `users/{user_id}/assets/projects/{project_id}/sources/{source_uid}/source/{filename}`
  - `users/{user_id}/pipeline-services/{service_slug}/projects/{project_id}/sources/{source_uid}/source/{filename}`
- Pipeline output object keys follow this locked shape:
  - `users/{user_id}/pipeline-services/{service_slug}/projects/{project_id}/sources/{source_uid}/jobs/{job_id}/asset.lexical.sqlite`
  - `users/{user_id}/pipeline-services/{service_slug}/projects/{project_id}/sources/{source_uid}/jobs/{job_id}/asset.semantic.zip`
- The pipeline registry is code-defined in this phase. A saved-config table such as `pipeline_configs` is intentionally deferred, but the route and table naming must not block that future extension.
- Flat job-id routes are deliberate in this phase because `job_id` is globally unique; kind-scoped routes are used only for source-scoped reads such as `sources` and `latest`.
- The worker dispatches by `pipeline_kind`; it does not hardcode markdown logic into the generic claim loop.

## Deferred Future Retrieval And Memory Options

These options are explicitly considered for later phases, but they do not change the phase-1 packaging contract:

1. The canonical semantic output in phase 1 remains `*.semantic.zip`, not a direct dependency on any specific vector database. That keeps the packaging pipeline query-backend-agnostic.
2. If a future query-serving layer is added, `LanceDB` is the strongest first candidate for a queryable semantic deliverable because it aligns most closely with the “embedded, SQLite-like, open locally and search immediately” product direction for vectors. `zvec` remains a secondary in-process option.
3. Because LanceDB OSS is path-oriented rather than a single SQLite-style file, the likely future deliverable shape is a LanceDB directory bundle, most likely shipped as something like `*.semantic.lancedb.zip`, rather than replacing `*.semantic.zip` with a single opaque file.
4. The intended evolution path is additive, not destructive: keep raw `*.semantic.zip` as the canonical interchange package that can always be rebuilt, and optionally add a query-ready LanceDB deliverable in a later phase for immediate local semantic search.
5. If local embedding execution is added, `LocalAI` is a strong candidate because it exposes an OpenAI-compatible API with embedding support. The intended extension path is to add it as another embedding provider behind the existing provider-selection contract, not as a special-case pipeline runtime.
6. `Mem0` and `Cognee` are not substitutes for the phase-1 packaging pipeline. They become relevant only if the product broadens into persistent memory, query-serving, graph retrieval, or agent-facing recall beyond static package generation.
7. If future users can choose retrieval/runtime targets, those options should be introduced as explicit downstream runtime targets or new pipeline kinds, such as `semantic_package`, `semantic_lancedb`, `semantic_zvec`, or a later memory-oriented pipeline family, rather than by mutating the required contents of `*.semantic.zip` or `*.lexical.sqlite`.
8. Any future plan that adopts `LanceDB`, `zvec`, `LocalAI`, `Mem0`, or `Cognee` must lock the full dependency cascade first: API surface, persistence contract, observability, caller surface, and verification path.

## Explicit Risks Accepted In This Plan

1. Building the generic pipeline framework now adds some up-front scope, but it avoids a second-type rename/refactor when another one-click pipeline is added.
2. The nav path `/app/rag` remains a compatibility path even though the product surface becomes generic Pipeline Services. That naming mismatch is accepted in this phase to avoid route churn.
3. The pipeline registry is code-defined rather than admin-configurable in this phase. Adding persisted pipeline configuration is a future plan.
4. The lexical SQLite package depends on SQLite FTS5 availability in the deployment image. Missing FTS5 support is a release blocker and must be caught in tests.
5. The semantic package depends on a usable user credential for the selected embedding provider. Missing or invalid credentials are accepted as a first-phase operational failure mode so long as they fail clearly at `embedding`.
6. Phase 1 status refresh uses polling rather than frontend realtime subscriptions. That trades some extra read traffic for a simpler and more deterministic job-status contract.
7. The `Index Builder` service slug is locked as `index-builder` in this phase. The parent Pipeline Services route remains `/app/rag`, and that naming split is accepted to avoid broader route churn.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked pipeline API surface exists exactly as specified in this plan.
2. The locked traces, metrics, and structured logs exist exactly as specified in this plan.
3. The generic `pipeline_jobs` and `pipeline_deliverables` schema exists exactly as specified in this plan.
4. `storage_objects` can persist pipeline deliverables with `storage_kind='pipeline'`.
5. `/app/rag` renders a real Pipeline Services page in the authenticated app and exposes a drill item for `Index Builder`.
6. The dedicated Pipeline Services upload surface, not the Assets column, is the primary entry point for this feature.
7. Existing owned markdown sources are selectable from inside the `Index Builder` service.
8. Stale-job recovery prevents orphaned running jobs from remaining stranded indefinitely.
9. No changed file for this feature lives under `supabase/functions/`.
10. The locked file inventory and counts in this plan match the implementation.

## Task 1: Add generic pipeline schema and storage-kind foundation

**File(s):** `supabase/migrations/20260327200000_pipeline_jobs_and_deliverables_foundation.sql`

**Step 1:** Create `pipeline_jobs` with `job_id`, `pipeline_kind`, `owner_id`, `project_id`, `source_uid`, lifecycle `status`, current `stage`, `failure_stage`, `error_message`, summary counters, embedding snapshot fields, `claimed_at`, `heartbeat_at`, and timestamps.
**Step 2:** Constrain `status` to the generic lifecycle vocabulary `queued`, `running`, `complete`, `failed`; keep `stage` as the kind-specific progress label.
**Step 3:** Create `pipeline_deliverables` with `job_id`, `pipeline_kind`, `deliverable_kind`, `storage_object_id`, filename, content type, byte size, checksum, and metadata.
**Step 4:** Broaden `storage_objects.storage_kind` to include `pipeline`.
**Step 5:** Add `claim_pipeline_jobs(p_pipeline_kind text, p_limit integer)` using `FOR UPDATE SKIP LOCKED`, moving claimed jobs from `queued` to `running` and stamping `claimed_at` and `heartbeat_at`.
**Step 6:** Add a stale-job reaper RPC or SQL path that marks expired running jobs `failed` when `heartbeat_at` exceeds the locked TTL.

**Test command:** `cd services/platform-api && pytest -q`
**Expected output:** no schema-related backend tests regress and the migration is syntactically valid.

**Commit:** `feat: add generic pipeline jobs and deliverables foundation`

## Task 2: Add pipeline registry, generic pipeline routes, and upload-surface routing

**File(s):** `services/platform-api/app/api/routes/pipelines.py`, `services/platform-api/app/pipelines/registry.py`, `services/platform-api/app/api/routes/storage.py`, `services/platform-api/app/main.py`, `services/platform-api/tests/test_storage_routes.py`

**Step 1:** Create a code-defined registry with `markdown_index_builder` as the first registered pipeline kind, including eligible source types and deliverable kinds.
**Step 2:** Implement `GET /pipelines/definitions`.
**Step 3:** Implement `GET /pipelines/{pipeline_kind}/sources` with explicit project ownership checks and source compatibility filtering.
**Step 4:** Implement `POST /pipelines/{pipeline_kind}/jobs` and `GET /pipelines/{pipeline_kind}/jobs/latest`.
**Step 5:** Implement `GET /pipelines/jobs/{job_id}` and `GET /pipelines/jobs/{job_id}/deliverables` with explicit job ownership enforcement.
**Step 6:** Implement `GET /pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download` with explicit job ownership enforcement and binary-stream headers.
**Step 7:** Modify `POST /storage/uploads` so source uploads can declare `storage_surface='assets'|'pipeline-services'` plus `storage_service_slug`, preserving the shared quota model while changing only path placement.
**Step 8:** Register the new router in `app/main.py`.

**Test command:** `cd services/platform-api && pytest -q tests/test_pipelines_routes.py tests/test_pipeline_registry.py tests/test_storage_routes.py`
**Expected output:** route and registry tests pass for happy path, invalid kind, source-list filtering, ownership rejection on all GET routes, latest-job lookup, binary-download headers, and upload-prefix routing for Assets versus Pipeline Services.

**Commit:** `feat: add generic pipeline routes and registry`

## Task 3: Add generic worker loop and pipeline observability

**File(s):** `services/platform-api/app/workers/pipeline_jobs.py`, `services/platform-api/app/observability/pipeline_metrics.py`, `services/platform-api/app/observability/contract.py`, `services/platform-api/app/main.py`

**Step 1:** Add a background worker supervisor that iterates registered pipeline kinds round-robin, claims jobs by `pipeline_kind`, and dispatches them to the registered handler through the shared process pool.
**Step 2:** Persist stage transitions and `heartbeat_at` updates before each stage begins and after each embedding batch.
**Step 3:** Add a periodic stale-job recovery sweep that fails expired running jobs according to the locked TTL.
**Step 4:** Keep CPU-heavy pipeline execution out of the async request loop by running handlers entirely inside worker processes.
**Step 5:** Add the locked traces, counters, histograms, and structured-log helpers with sanitized attributes.
**Step 6:** Start and stop the worker from platform-api lifespan code in `main.py`.

**Test command:** `cd services/platform-api && pytest -q tests/test_pipeline_worker.py`
**Expected output:** worker tests pass for claim/dispatch/complete, claim/dispatch/fail, stale-job reaping, and non-inline create behavior.

**Commit:** `feat: add generic pipeline worker and telemetry`

## Task 4: Implement the markdown_index_builder processor

**File(s):** `services/platform-api/app/pipelines/markdown_index_builder.py`, `services/platform-api/requirements.txt`

**Step 1:** Add `mistune` and `numpy` to `services/platform-api/requirements.txt`.
**Step 2:** Implement markdown parsing and normalization for uploaded markdown bytes fetched from owned source storage.
**Step 3:** Derive stable section IDs, heading paths, heading levels, and section order.
**Step 4:** Build retrieval chunks with locked metadata: `chunk_id`, `section_id`, `heading_path`, `title`, `text`, `ordinal`, and approximate token count.
**Step 5:** Keep stage callbacks aligned to `parsing`, `normalizing`, `structuring`, and `chunking`.

**Test command:** `cd services/platform-api && pytest -q tests/test_markdown_index_builder_pipeline.py`
**Expected output:** markdown processor tests pass for invalid input, section identity, chunk sizing, and stage ordering.

**Commit:** `feat: add markdown discussion processor`

## Task 5: Add lexical, semantic, and embedding services for markdown_index_builder

**File(s):** `services/platform-api/app/services/pipeline_storage.py`, `services/platform-api/app/services/pipeline_embeddings.py`, `services/platform-api/app/pipelines/markdown_index_builder.py`

**Step 1:** Build the lexical package with built-in `sqlite3`, creating `document`, `sections`, `chunks`, `chunks_fts`, and `manifest`.
**Step 2:** Resolve provider candidates from `model_role_assignments` where `role_key='embedding'`, ordered by priority, then select the first provider/model with a usable user credential.
**Step 3:** Execute embeddings in locked batches, with transient retry/backoff and no cross-provider mixing inside one job.
**Step 4:** Build the semantic package with `manifest.json`, `chunks.jsonl`, `embeddings.npy`, and chunk-id mapping metadata.
**Step 5:** Upload both final artifacts into the locked GCS path through quota-accounted storage-object creation, write `storage_objects` rows with `storage_kind='pipeline'`, and persist `pipeline_deliverables`.
**Step 6:** Keep temporary intermediate artifacts local to the worker and delete them on success or failure.

**Test command:** `cd services/platform-api && pytest -q tests/test_markdown_index_builder_pipeline.py`
**Expected output:** packaging tests confirm required files exist, the lexical SQLite contains required tables, and missing credentials fail at `embedding`.

**Commit:** `feat: add markdown discussion package builders`

## Task 6: Add Pipeline Services landing page and drill navigation

**File(s):** `web/src/pages/PipelineServicesPage.tsx`, `web/src/pages/usePipelineServicesWorkbench.tsx`, `web/src/router.tsx`, `web/src/components/shell/nav-config.ts`

**Step 1:** Mount a real authenticated route at `/app/rag` plus a dedicated service route for `index-builder` backed by `markdown_index_builder` under the Pipeline Services drill menu.
**Step 2:** Build a Pipeline Services landing/workbench shell that can load pipeline definitions and route into the selected service.
**Step 3:** Update `nav-config.ts` so `PIPELINE_SERVICES_DRILL` exposes a dedicated markdown-discussion menu item instead of a single generic RAG label.

**Test command:** `cd web && npm run test -- --run src/components/shell/nav-config.test.ts`
**Expected output:** nav and route tests pass with `/app/rag` mounted, the Pipeline Services drill expanded, and the markdown-discussion service reachable as a dedicated route.

**Commit:** `feat: add pipeline services page`

## Task 7: Add Pipeline Services upload, status, and deliverables UI

**File(s):** `web/src/components/pipelines/PipelineCatalogPanel.tsx`, `web/src/components/pipelines/PipelineUploadPanel.tsx`, `web/src/components/pipelines/PipelineJobStatusPanel.tsx`, `web/src/components/pipelines/PipelineDeliverablesPanel.tsx`, `web/src/hooks/usePipelineJob.ts`, `web/src/lib/pipelineService.ts`

**Step 1:** Add a service layer for `GET /pipelines/definitions`, `GET /pipelines/{pipeline_kind}/sources`, job create, latest job read, job detail read, deliverable list, deliverable download, and reuse of the existing storage-upload endpoints for markdown-only uploads with explicit Pipeline Services surface routing.
**Step 2:** Build `PipelineCatalogPanel` as the landing/service chooser and `PipelineUploadPanel` as the markdown service’s upload-plus-source-selector surface.
**Step 3:** Add a hook that handles trigger state, owned-source loading, latest-job hydration, authoritative polling, failure display, and completion transitions for one selected pipeline plus one selected markdown source.
**Step 4:** Build the status and deliverables panels to render the locked stage vocabulary and the two markdown-discussion deliverables.

**Test command:** `cd web && npm run test -- --run src/lib/pipelineService.test.ts src/hooks/usePipelineJob.test.ts src/components/pipelines/PipelineCatalogPanel.test.tsx src/components/pipelines/PipelineUploadPanel.test.tsx src/components/pipelines/PipelineJobStatusPanel.test.tsx src/components/pipelines/PipelineDeliverablesPanel.test.tsx`
**Expected output:** service, hook, and UI tests pass for service selection, owned-source selection, upload, queued/running/complete/failed states, polling transitions, and deliverable download enablement.

**Commit:** `feat: add pipeline services status and deliverables ui`

## Task 8: Add dedicated markdown-discussion source upload flow and owned-source sync

**File(s):** `web/src/pages/usePipelineServicesWorkbench.tsx`, `web/src/components/pipelines/PipelineUploadPanel.tsx`, `web/src/lib/pipelineService.ts`

**Step 1:** Add a markdown-only upload surface inside the `Index Builder` service that uses the existing storage upload backend, passes `storage_surface='pipeline-services'` plus `storage_service_slug='index-builder'`, and produces owned `source_documents` under the service-specific Pipeline Services storage prefix.
**Step 2:** After upload completion, refresh the owned-source list, select the new source in the workbench, and keep job initiation manual.
**Step 3:** Keep the same surface responsible for both “upload new” and “select existing” source flows.

**Test command:** `cd web && npm run test -- --run src/components/pipelines/PipelineUploadPanel.test.tsx src/hooks/usePipelineJob.test.ts src/lib/pipelineService.test.ts`
**Expected output:** markdown uploads succeed from the dedicated service UI, the reservation request targets the Pipeline Services surface prefix, the resulting source is selectable immediately from the refreshed owned-source list, and no job is auto-started on upload completion.

**Commit:** `feat: add dedicated markdown pipeline upload flow`

## Task 9: Run end-to-end verification and inventory check

**File(s):** `docs/plans/2026-03-27-markdown-processing-packages-platform-api-implementation-plan.md`

**Step 1:** Run targeted backend tests for migrations, routes, registry, upload-surface routing, worker, and `markdown_index_builder` processing.
**Step 2:** Run targeted frontend tests for the new Pipeline Services page, catalog, upload/source-selector flow, hook, and deliverables UI.
**Step 3:** Verify `/app/rag` renders, the Pipeline Services drill exposes the markdown-discussion service, the dedicated upload flow works, existing-source selection works, and no changed file lives under `supabase/functions/`.
**Step 4:** Verify the final file inventory matches this plan.

**Test command:** `cd services/platform-api && pytest -q && cd /e/writing-system/web && npm run test`
**Expected output:** targeted backend and frontend tests pass, `/app/rag` is live with the dedicated markdown-discussion service flow, and the changed-file inventory matches this plan with zero edge-function modifications.

**Commit:** `test: verify pipeline services markdown discussion plan inventory`
