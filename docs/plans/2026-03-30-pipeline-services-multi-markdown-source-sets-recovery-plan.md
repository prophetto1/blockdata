# Pipeline Services Multi-Markdown Source Sets Recovery Plan

**Goal:** Replace the current single-markdown Pipeline Services flow with a source-set based `Index Builder` workflow that accepts many markdown files, lets the user see and manage those files in the UI, consolidates them into one canonical backend-owned markdown document with preserved source provenance, and then produces the existing lexical and semantic deliverables from that consolidated document.

**Architecture:** Keep individual markdown uploads as durable `source_documents` and `storage_objects` in the shared user storage system. Add a first-class Pipeline Services input-set layer in `services/platform-api` so one `Index Builder` run targets a `source_set_id`, not one `source_uid`. The worker loads the ordered markdown members of the set, validates and normalizes them, builds one internal consolidated markdown artifact in worker-local temp storage, preserves file-level provenance in both runtime metadata and final deliverables, and then runs the existing lexical/semantic packaging pipeline against that consolidated document. The frontend at `/app/pipeline-services/index-builder` is a locked, page-embedded three-phase workflow derived from a bulk-upload reference design: `Upload`, `Processing`, and `Deliverables`. The exact frontend shape is implemented first and becomes the contract the backend must satisfy.

**Tech Stack:** FastAPI, Supabase Postgres migrations and RPCs, GCS-backed user storage, React + TypeScript, Vitest, pytest, OpenTelemetry, built-in `sqlite3`, `zipfile`, `mistune`, `numpy`, `httpx`.

**Status:** Draft
**Author:** Codex for jwchu
**Date:** 2026-03-30

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/pipelines/definitions` | List registered pipeline kinds | Existing - no contract change |
| GET | `/pipelines/{pipeline_kind}/sources` | List eligible owned markdown files for one project, regardless of whether they were uploaded from Assets or Pipeline Services | Modified |
| GET | `/pipelines/{pipeline_kind}/source-sets` | List saved source sets for one project | New |
| POST | `/pipelines/{pipeline_kind}/source-sets` | Create one source set from one or more owned markdown sources | New |
| GET | `/pipelines/{pipeline_kind}/source-sets/{source_set_id}` | Read one saved source set with ordered member files and latest job summary | New |
| PATCH | `/pipelines/{pipeline_kind}/source-sets/{source_set_id}` | Rename a source set, reorder members, add members, or remove members | New |
| POST | `/pipelines/{pipeline_kind}/jobs` | Create a manual pipeline job for one `source_set_id` | Modified |
| GET | `/pipelines/{pipeline_kind}/jobs/latest` | Read the latest job for one `source_set_id` | Modified |
| GET | `/pipelines/jobs/{job_id}` | Read job state and current stage | Existing - no contract change |
| GET | `/pipelines/jobs/{job_id}/deliverables` | List deliverables for one completed job | Existing - no contract change |
| GET | `/pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download` | Download one deliverable | Existing - no contract change |
| POST | `/storage/uploads` | Reserve upload slots for markdown source files | Existing - no contract change beyond already-landed Pipeline Services routing fields |
| POST | `/storage/uploads/{reservation_id}/complete` | Finalize uploaded markdown source files and bridge to `source_documents` | Existing - no contract change |

#### New endpoint contracts

`GET /pipelines/{pipeline_kind}/source-sets`

- Auth: `require_user_auth`
- Request: query param `project_id`
- Response `200`: `{ "items": [{ "source_set_id": string, "project_id": string, "label": string, "member_count": number, "total_bytes": number, "updated_at": string, "latest_job": PipelineJobSummary | null }] }`
- Touches: `public.pipeline_source_sets`, `public.pipeline_source_set_items`, `public.pipeline_jobs`

`POST /pipelines/{pipeline_kind}/source-sets`

- Auth: `require_user_auth`
- Request: `{ "project_id": string, "label": string, "source_uids": string[] }`
- Response `201`: `{ "source_set": { "source_set_id": string, "project_id": string, "label": string, "member_count": number, "total_bytes": number, "items": SourceSetItem[] } }`
- Touches: `public.pipeline_source_sets`, `public.pipeline_source_set_items`, `public.source_documents`
- Validation:
  - `source_uids` must contain at least `1` and at most `100` items in phase 1
  - every source must belong to the authenticated user and selected project
  - every source must be markdown-compatible

`GET /pipelines/{pipeline_kind}/source-sets/{source_set_id}`

- Auth: `require_user_auth`
- Request: path param only
- Response `200`: `{ "source_set": { "source_set_id": string, "project_id": string, "label": string, "member_count": number, "total_bytes": number, "items": SourceSetItem[], "latest_job": PipelineJobSummary | null } }`
- Touches: `public.pipeline_source_sets`, `public.pipeline_source_set_items`, `public.pipeline_jobs`

`PATCH /pipelines/{pipeline_kind}/source-sets/{source_set_id}`

- Auth: `require_user_auth`
- Request: `{ "label"?: string, "source_uids"?: string[] }`
- Response `200`: `{ "source_set": { ...same shape as GET detail... } }`
- Touches: `public.pipeline_source_sets`, `public.pipeline_source_set_items`, `public.source_documents`
- Behavior:
  - omitting `source_uids` leaves membership unchanged
  - replacing `source_uids` fully replaces the ordered membership list
  - at least one markdown source must remain in the set

#### Modified endpoint contracts

`GET /pipelines/{pipeline_kind}/sources`

- Change: list eligible markdown files across the selected project, not only files already under the `pipeline-services/index-builder` prefix
- Why: the user requirement is “many markdown files uploaded” with backend consolidation, not “only markdown files previously uploaded through this exact service surface”
- Response `200`: `{ "items": [{ "source_uid": string, "project_id": string, "doc_title": string, "source_type": string, "content_type": string | null, "byte_size": number | null, "created_at": string | null, "source_origin": "assets" | "pipeline-services", "object_key": string }] }`
- Attribute note: `object_key` is response-only metadata for internal UI logic and must never appear in traces, metrics, or sanitized logs

`POST /pipelines/{pipeline_kind}/jobs`

- Change: request body becomes `{ "source_set_id": string }`
- Response `202`: `{ "job_id": uuid, "pipeline_kind": string, "source_set_id": string, "status": "queued", "stage": "queued" }`
- Behavior:
  - rejects active queued/running job for the same `source_set_id` and `pipeline_kind`
  - does not perform inline processing

`GET /pipelines/{pipeline_kind}/jobs/latest`

- Change: query param becomes `source_set_id`
- Response `200`: `{ "job": null | PipelineJobDetail }`

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `pipeline.definitions.list` | `services/platform-api/app/api/routes/pipelines.py:list_pipeline_definitions` | Measure registry-list latency |
| Trace span | `pipeline.sources.list` | `pipelines.py:list_pipeline_sources` | Measure eligible source-file list latency |
| Trace span | `pipeline.source_sets.list` | `pipelines.py:list_pipeline_source_sets` | Measure source-set list latency |
| Trace span | `pipeline.source_sets.create` | `pipelines.py:create_pipeline_source_set` | Measure source-set creation latency and validation failures |
| Trace span | `pipeline.source_sets.read` | `pipelines.py:get_pipeline_source_set` | Measure source-set detail reads |
| Trace span | `pipeline.source_sets.update` | `pipelines.py:update_pipeline_source_set` | Measure source-set mutations |
| Trace span | `pipeline.job.create` | `pipelines.py:create_pipeline_job` | Measure enqueue latency |
| Trace span | `pipeline.job.read` | `pipelines.py:get_pipeline_job` and `get_latest_pipeline_job` | Measure job-read latency |
| Trace span | `pipeline.deliverables.list` | `pipelines.py:list_pipeline_deliverables` | Measure deliverable-list latency |
| Trace span | `pipeline.deliverable.download` | `pipelines.py:download_pipeline_deliverable` | Measure deliverable download latency |
| Trace span | `pipeline.job.claim` | `services/platform-api/app/workers/pipeline_jobs.py` | Measure claim activity |
| Trace span | `pipeline.job.reap` | `pipeline_jobs.py` | Measure stale-job recovery |
| Trace span | `pipeline.job.run` | `pipeline_jobs.py` | Measure end-to-end job duration |
| Trace span | `pipeline.stage.execute` | `services/platform-api/app/pipelines/markdown_index_builder.py` | Emit one span per stage, including new source consolidation stages |
| Counter | `platform.pipeline.job.create.count` | job create route | Count create attempts by result |
| Counter | `platform.pipeline.job.complete.count` | worker completion path | Count completed jobs |
| Counter | `platform.pipeline.job.failed.count` | worker failure path | Count failed jobs by failure stage |
| Counter | `platform.pipeline.job.reaped.count` | worker reaper path | Count stale jobs marked failed |
| Counter | `platform.pipeline.deliverable.download.count` | download path | Count deliverable downloads |
| Counter | `platform.pipeline.source_set.create.count` | source-set create route | Count source-set creates |
| Counter | `platform.pipeline.source_set.update.count` | source-set update route | Count source-set updates |
| Histogram | `platform.pipeline.job.duration.ms` | worker completion/failure path | Track full job duration |
| Histogram | `platform.pipeline.stage.duration.ms` | stage execution helper | Track stage-by-stage duration |
| Histogram | `platform.pipeline.chunk.count` | markdown packaging path | Track chunk counts |
| Histogram | `platform.pipeline.source_set.member_count` | source-set create/update routes | Track number of markdown inputs per set |
| Structured log | `pipeline.job.completed` | worker completion path | Audit pipeline kind, source-set size, chunk count, and deliverable kinds |
| Structured log | `pipeline.job.failed` | worker failure path | Audit pipeline kind and failure stage |
| Structured log | `pipeline.job.reaped` | worker stale-job path | Audit stale-job recovery |
| Structured log | `pipeline.source_set.changed` | source-set create/update routes | Audit source-set create/update without leaking raw file names |

Observability attribute rules:

- Allowed trace/metric attributes: `pipeline.kind`, `stage`, `status`, `result`, `deliverable.kind`, `source.type`, `source.origin`, `member.count`, `chunk.count`, `section.count`, `http.status_code`, `embedding.provider`, `embedding.model`, `has_project_id`, `recovery.reason`
- Forbidden in trace or metric attributes: `user_id`, `job_id`, `source_uid`, `source_set_id`, raw filenames, raw titles, raw markdown, full object keys, signed URLs, raw provider error payloads

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260330120000_pipeline_source_sets_foundation.sql` | Creates `pipeline_source_sets` and `pipeline_source_set_items`; adds `source_set_id` to `pipeline_jobs`; adds indexes and RLS; backfills existing `pipeline_jobs` rows that still point at one `source_uid` into one-item source sets; then enforces `source_set_id` as required for persisted jobs | Yes - backfills existing pipeline jobs into synthetic single-item sets |
| `20260330130000_pipeline_source_set_storage_contract.sql` | Adds any required helper SQL for source-set reads/writes and locks job uniqueness on `(owner_id, pipeline_kind, source_set_id)` for active jobs | No user-visible data rewrite beyond the backfill above |

### Edge Functions

No edge functions created or modified.

The full runtime seam remains `services/platform-api` plus Supabase Postgres and GCS-backed user storage.

### Frontend Surface Area

**New pages:** `0`

**New components:** `2`

| Component | File | Used by |
|-----------|------|---------|
| `PipelineSourceFilesPanel` | `web/src/components/pipelines/PipelineSourceFilesPanel.tsx` | `usePipelineServicesWorkbench.tsx` |
| `PipelineSourceSetPanel` | `web/src/components/pipelines/PipelineSourceSetPanel.tsx` | `usePipelineServicesWorkbench.tsx` |

**Modified components:** `3`

| Component | File | What changes |
|-----------|------|--------------|
| `PipelineUploadPanel` | `web/src/components/pipelines/PipelineUploadPanel.tsx` | Change from one-file upload + one-source select to multi-file upload entry plus status summary |
| `PipelineJobStatusPanel` | `web/src/components/pipelines/PipelineJobStatusPanel.tsx` | Show source-set context and new consolidation stages |
| `PipelineDeliverablesPanel` | `web/src/components/pipelines/PipelineDeliverablesPanel.tsx` | Show source-set/member metadata with deliverables |

**New hooks/services:** `2`

| Artifact | File | Purpose |
|----------|------|---------|
| `usePipelineSourceSet` | `web/src/hooks/usePipelineSourceSet.ts` | Handle source-file list, source-set create/update, selection, and refresh |
| `pipelineSourceSetService` | `web/src/lib/pipelineSourceSetService.ts` | Platform API calls for source-set CRUD |

**Modified hooks/services:** `3`

| Artifact | File | What changes |
|----------|------|--------------|
| `usePipelineJob` | `web/src/hooks/usePipelineJob.ts` | Track `source_set_id`, not one `source_uid`, and poll latest job by source set |
| `pipelineService` | `web/src/lib/pipelineService.ts` | Update job create/latest read contracts to use `source_set_id`; broaden source list semantics |
| `usePipelineServicesWorkbench` | `web/src/pages/usePipelineServicesWorkbench.tsx` | Mount the multi-file source-set workflow and selection model |

**Modified pages/routes:** `2`

| File | What changes |
|------|--------------|
| `web/src/pages/PipelineServicesPage.tsx` | Keep current page shell, but mount the new source-files/source-set workflow |
| `web/src/router.tsx` | Keep `/app/pipeline-services` canonical and preserve `/app/rag` only as a compatibility redirect |

**Other supporting files:** `1`

| File | Purpose |
|------|---------|
| `docs/plans/2026-03-30-pipeline-services-multi-markdown-source-sets-recovery-plan.md` | Holds the locked frontend design contract and implementation order for the bulk-loader workflow |

## Pre-Implementation Contract

No major product, API, observability, database, or inventory decision may be improvised during implementation. If any locked item below changes, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The canonical product route is `/app/pipeline-services`, not `/app/rag`. `/app/rag` remains a compatibility redirect only.
2. `Index Builder` is no longer a single-source workflow. The primary owned input is a source set containing one or more markdown files.
3. Individual markdown files still upload through the existing storage/source-document spine. The new input-set layer groups those files; it does not replace `source_documents`.
4. Backend consolidation is required. Users must not be required to copy/paste many markdown files into one file manually.
5. The worker-owned consolidated markdown artifact is internal-only in this phase. It stays in temp storage and is not uploaded as a separate user-visible deliverable.
6. Final deliverables remain `asset.lexical.sqlite` and `asset.semantic.zip`.
7. Both deliverables must preserve file-level provenance derived from the source set, not just section/chunk text.
8. The source list in Pipeline Services must include eligible owned markdown files from the selected project, regardless of whether they were uploaded from Assets or from the Pipeline Services surface.
9. Upload remains separate from processing. Uploading files never auto-starts a pipeline job.
10. Polling remains the authoritative refresh mechanism in this phase.
11. The frontend interaction model is locked before backend implementation proceeds. The backend must conform to the approved frontend contract rather than inventing its own interaction shape.
12. `Import From URL` is explicitly out of scope for this revision.

### Locked Frontend Design Contract

The `Index Builder` page is a page-embedded workflow, not a modal. It uses a bulk-upload visual pattern derived from the user-provided Dribbble bulk-upload reference, but removes URL import and adapts the lower half for Pipeline Services.

The page has exactly three user-visible phases:

1. **Upload**
   - A prominent drag-and-drop markdown upload zone at the top of the page
   - A visible uploaded-markdown inventory below it
   - Per-file rows with filename, byte-size or status text, and remove action before run
   - A selected processing-set area that shows the files that will be run, with explicit ordering and reorder controls
   - A set label input and one primary run action

2. **Processing**
   - A fixed stage-by-stage progress tracker appears after the user presses `Run` or `Start processing`
   - All stages are visible up front
   - Each stage renders one of: `pending`, `in progress`, `done`, or `failed`
   - The tracker is driven by backend polling of the canonical `stage` field every `2` seconds
   - This is a checklist/stepper, not a generic single progress bar

3. **Deliverables**
   - On success, the same page shows download actions for `asset.lexical.sqlite` and `asset.semantic.zip`
   - Deliverables appear only after the pipeline reaches `complete`

The page must continue to show source-set context while processing. The progress tracker does not replace the entire page with a blank loading view.

### Locked Frontend Stage Tracker Contract

The frontend must show these stages in this exact visible order:

1. `Loading sources`
2. `Consolidating`
3. `Parsing`
4. `Normalizing`
5. `Structuring`
6. `Chunking`
7. `Lexical indexing`
8. `Embedding`
9. `Packaging`

The display labels map one-to-one from backend `stage` values:

- `loading_sources` -> `Loading sources`
- `consolidating` -> `Consolidating`
- `parsing` -> `Parsing`
- `normalizing` -> `Normalizing`
- `structuring` -> `Structuring`
- `chunking` -> `Chunking`
- `lexical_indexing` -> `Lexical indexing`
- `embedding` -> `Embedding`
- `packaging` -> `Packaging`

State behavior:

- future stages render as `pending`
- the active backend stage renders as `in progress`
- completed stages render as `done`
- on failure, the active stage renders as `failed` and later stages remain `pending`
- the failure message is attached to the failed stage, not to a generic page-level spinner

This tracker is mandatory. The plan does not allow implementation to replace it with a single bar, vague loading copy, or a hidden background job model.

### Locked Source Set Contract

1. A source set contains between `1` and `100` markdown files in phase 1.
2. A source set is project-scoped and pipeline-kind-scoped.
3. Ordered membership is explicit and persisted.
4. Each member preserves `source_uid`, display title, source order, byte size, and object-key locator.
5. A single-file flow is supported as a degenerate one-member source set; the system does not keep a separate single-source job model after this plan lands.
6. After migration backfill completes, every persisted `pipeline_jobs` row must have a non-null `source_set_id`.

### Locked Consolidation Contract

1. The worker loads all source-set members in order.
2. Each member is UTF-8 validated and normalized before consolidation.
3. Consolidation produces one canonical markdown document in worker-local temp storage only.
4. File boundaries are explicit in the consolidated document and in output metadata.
5. Section and chunk records carry source provenance:
   - `source_uid`
   - `source_title`
   - `source_order`
   - `source_heading_path`
6. If one member fails validation, the job fails before lexical indexing starts, with `failure_stage='consolidating'`.

### Locked Stage Contract

The user-visible stage vocabulary becomes:

1. `queued`
2. `loading_sources`
3. `consolidating`
4. `parsing`
5. `normalizing`
6. `structuring`
7. `chunking`
8. `lexical_indexing`
9. `embedding`
10. `packaging`

`status` remains lifecycle-level: `queued`, `running`, `complete`, `failed`.

### Locked Acceptance Contract

The work is only complete when all of the following are true:

1. On `/app/pipeline-services/index-builder`, a user can upload many markdown files in one session and visibly see those files in the UI.
2. The page uses the locked three-phase workflow: `Upload`, `Processing`, `Deliverables`.
3. The UI can show and manage at least `10` markdown files in one source set without collapsing into a single-select control.
4. A user can create one source set from many owned markdown files and reorder them before running the pipeline.
5. A pipeline job can be triggered against a `source_set_id`, not one `source_uid`.
6. The backend consolidates the set into one internal canonical markdown document without requiring user-side manual consolidation.
7. After the user presses `Run`, the page shows the full stage tracker immediately, with all stages visible up front.
8. The tracker advances through `Loading sources`, `Consolidating`, `Parsing`, `Normalizing`, `Structuring`, `Chunking`, `Lexical indexing`, `Embedding`, and `Packaging`, marking each stage `in progress` then `done` as the backend stage advances.
9. On completion, the user can download one `asset.lexical.sqlite` and one `asset.semantic.zip`.
10. The lexical package contains the existing required tables plus source provenance columns or tables sufficient to recover which input file produced each section and chunk.
11. The semantic package contains `manifest.json`, `chunks.jsonl`, `embeddings.npy`, and chunk/source mapping metadata.
12. If the user has no usable embedding credential, the job fails at `embedding`, the failed stage is visibly red or failed-state equivalent, and the failure message is visible on that stage.
13. If one uploaded markdown file is invalid UTF-8 or missing in storage, the job fails at `consolidating` with a clear message.
14. Final deliverables count against the shared user quota. The internal consolidated markdown artifact does not.
15. `/app/rag` still resolves through redirect compatibility, but no primary nav or breadcrumb uses `RAG`.

### Locked Platform API Surface

#### Existing pipeline endpoints retained without path change: `5`

1. `GET /pipelines/definitions`
2. `GET /pipelines/jobs/{job_id}`
3. `GET /pipelines/jobs/{job_id}/deliverables`
4. `GET /pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download`
5. `POST /storage/uploads/{reservation_id}/complete`

#### Modified pipeline endpoints: `3`

1. `GET /pipelines/{pipeline_kind}/sources`
2. `POST /pipelines/{pipeline_kind}/jobs`
3. `GET /pipelines/{pipeline_kind}/jobs/latest`

#### New pipeline endpoints: `4`

1. `GET /pipelines/{pipeline_kind}/source-sets`
2. `POST /pipelines/{pipeline_kind}/source-sets`
3. `GET /pipelines/{pipeline_kind}/source-sets/{source_set_id}`
4. `PATCH /pipelines/{pipeline_kind}/source-sets/{source_set_id}`

### Locked Inventory Counts

#### Database

- New migrations: `2`

#### Backend

- New route or service modules: `3`
- Modified backend modules: `9`

#### Frontend

- New visual components: `2`
- New hooks/services: `2`
- Modified frontend files: `12`

#### Tests

- New pytest modules: `2`
- Modified pytest modules: `3`
- New Vitest modules: `2`
- Modified Vitest modules: `6`

### Locked File Inventory

#### New backend files

- `services/platform-api/app/services/pipeline_source_sets.py`
- `services/platform-api/tests/test_pipeline_source_sets_routes.py`
- `services/platform-api/tests/test_pipeline_multi_markdown_job.py`

#### Modified backend files

- `services/platform-api/app/api/routes/pipelines.py`
- `services/platform-api/app/pipelines/markdown_index_builder.py`
- `services/platform-api/app/services/pipeline_storage.py`
- `services/platform-api/app/workers/pipeline_jobs.py`
- `services/platform-api/app/observability/pipeline_metrics.py`
- `services/platform-api/app/observability/contract.py`
- `services/platform-api/tests/test_pipelines_routes.py`
- `services/platform-api/tests/test_pipeline_worker.py`
- `services/platform-api/tests/test_markdown_index_builder_pipeline.py`

#### New database files

- `supabase/migrations/20260330120000_pipeline_source_sets_foundation.sql`
- `supabase/migrations/20260330130000_pipeline_source_set_storage_contract.sql`

#### New frontend files

- `web/src/components/pipelines/PipelineSourceFilesPanel.tsx`
- `web/src/components/pipelines/PipelineSourceSetPanel.tsx`
- `web/src/hooks/usePipelineSourceSet.ts`
- `web/src/lib/pipelineSourceSetService.ts`
- `web/src/components/pipelines/PipelineSourceFilesPanel.test.tsx`
- `web/src/components/pipelines/PipelineSourceSetPanel.test.tsx`

#### Modified frontend files

- `web/src/pages/usePipelineServicesWorkbench.tsx`
- `web/src/components/pipelines/PipelineUploadPanel.tsx`
- `web/src/components/pipelines/PipelineJobStatusPanel.tsx`
- `web/src/components/pipelines/PipelineDeliverablesPanel.tsx`
- `web/src/hooks/usePipelineJob.ts`
- `web/src/lib/pipelineService.ts`
- `web/src/pages/PipelineServicesPage.test.tsx`
- `web/src/components/pipelines/PipelineUploadPanel.test.tsx`
- `web/src/components/pipelines/PipelineJobStatusPanel.test.tsx`
- `web/src/components/pipelines/PipelineDeliverablesPanel.test.tsx`
- `web/src/hooks/usePipelineJob.test.ts`
- `web/src/lib/pipelineService.test.ts`

## Frozen Compatibility Contract

The already-landed single-source implementation is not the final product shape. It is a temporary compatibility state.

- Existing single-source jobs may continue to exist in the database.
- The new implementation must backfill them into one-member source sets.
- The frontend must stop presenting a single-source mental model after this plan lands.
- The deliverable contract stays stable while the input contract changes underneath it.

## Explicit Risks Accepted In This Plan

1. Supporting many markdown files adds new grouping state and new API surface, but avoiding that would force users into manual file consolidation, which the user explicitly rejected.
2. Consolidation can increase job size and stage time, so source-set size is capped in phase 1.
3. File ordering affects output. That is intentional and user-controlled in this phase.
4. The canonical route remains `/app/pipeline-services`; redirect compatibility from `/app/rag` is acceptable until downstream bookmarks are updated.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked frontend bulk-loader and stage-tracker contract is implemented exactly as specified before backend completion is claimed.
2. The locked source-set API surface exists exactly as specified.
3. The locked source-set database layer exists and existing single-source jobs are backfilled safely.
4. The frontend can upload, show, select, reorder, and run many markdown files without forcing one-file manual consolidation.
5. The worker consolidates many markdown files internally and preserves provenance into deliverables.
6. The locked observability surface exists for source-set operations and multi-file pipeline execution.
7. The canonical route and nav use `/app/pipeline-services`, with `/app/rag` preserved only as redirect compatibility.
8. The file inventory and counts in this plan match implementation.

## Task 1: Lock and implement the frontend bulk-loader contract first

**File(s):** `web/src/pages/PipelineServicesPage.tsx`, `web/src/pages/usePipelineServicesWorkbench.tsx`, `web/src/components/pipelines/PipelineUploadPanel.tsx`, `web/src/components/pipelines/PipelineSourceFilesPanel.tsx`, `web/src/components/pipelines/PipelineSourceSetPanel.tsx`, `web/src/components/pipelines/PipelineJobStatusPanel.tsx`, `web/src/components/pipelines/PipelineDeliverablesPanel.tsx`, `web/src/pages/PipelineServicesPage.test.tsx`, `web/src/components/pipelines/PipelineUploadPanel.test.tsx`, `web/src/components/pipelines/PipelineSourceFilesPanel.test.tsx`, `web/src/components/pipelines/PipelineSourceSetPanel.test.tsx`, `web/src/components/pipelines/PipelineJobStatusPanel.test.tsx`, `web/src/components/pipelines/PipelineDeliverablesPanel.test.tsx`

**Step 1:** Implement the page-embedded three-phase layout: `Upload`, `Processing`, `Deliverables`.
**Step 2:** Remove URL import from the visual contract entirely.
**Step 3:** Implement the bulk markdown upload zone plus uploaded-file inventory.
**Step 4:** Implement the selected processing-set area with ordering/reordering controls.
**Step 5:** Implement the full stage tracker with all stages visible up front and explicit `pending`, `in progress`, `done`, and `failed` rendering.
**Step 6:** Keep source-set context visible while the tracker runs.

**Test command:** `cd web && npm run test -- --run src/pages/PipelineServicesPage.test.tsx src/components/pipelines/PipelineUploadPanel.test.tsx src/components/pipelines/PipelineSourceFilesPanel.test.tsx src/components/pipelines/PipelineSourceSetPanel.test.tsx src/components/pipelines/PipelineJobStatusPanel.test.tsx src/components/pipelines/PipelineDeliverablesPanel.test.tsx`
**Expected output:** the locked bulk-loader and stage-tracker UI contract is proven in tests before backend completion work proceeds.

**Commit:** `feat: lock pipeline services bulk loader frontend contract`

## Task 2: Add source-set schema and backfill path

**File(s):** `supabase/migrations/20260330120000_pipeline_source_sets_foundation.sql`, `supabase/migrations/20260330130000_pipeline_source_set_storage_contract.sql`

**Step 1:** Create `pipeline_source_sets` with `source_set_id`, `pipeline_kind`, `owner_id`, `project_id`, `label`, timestamps, and RLS.
**Step 2:** Create `pipeline_source_set_items` with ordered membership rows keyed by `source_set_id` + `ordinal`.
**Step 3:** Add `source_set_id` to `pipeline_jobs` as temporarily nullable only for the backfill operation.
**Step 4:** Backfill existing jobs with synthetic one-member source sets derived from `source_uid`.
**Step 5:** Enforce `source_set_id IS NOT NULL` for persisted jobs and add active-job uniqueness on `(owner_id, pipeline_kind, source_set_id)` for queued/running rows.

**Test command:** `cd services/platform-api && pytest -q`
**Expected output:** migration-sensitive backend tests stay green and new source-set schema tests pass.

**Commit:** `feat: add pipeline source set foundation`

## Task 3: Replace the single-source API contract with source-set APIs

**File(s):** `services/platform-api/app/api/routes/pipelines.py`, `services/platform-api/app/services/pipeline_source_sets.py`, `services/platform-api/tests/test_pipelines_routes.py`, `services/platform-api/tests/test_pipeline_source_sets_routes.py`

**Step 1:** Broaden `GET /pipelines/{pipeline_kind}/sources` to list eligible markdown files across the selected project.
**Step 2:** Add source-set list/create/detail/update endpoints.
**Step 3:** Change job create/latest endpoints to use `source_set_id`.
**Step 4:** Keep job-detail and deliverable endpoints unchanged.

**Test command:** `cd services/platform-api && pytest -q tests/test_pipelines_routes.py tests/test_pipeline_source_sets_routes.py`
**Expected output:** route tests prove multi-file source discovery, source-set CRUD, ownership enforcement, and source-set-based job creation.

**Commit:** `feat: add pipeline source set routes`

## Task 4: Upgrade the worker and processor to consolidate many markdown files

**File(s):** `services/platform-api/app/pipelines/markdown_index_builder.py`, `services/platform-api/app/services/pipeline_storage.py`, `services/platform-api/app/workers/pipeline_jobs.py`, `services/platform-api/tests/test_markdown_index_builder_pipeline.py`, `services/platform-api/tests/test_pipeline_multi_markdown_job.py`

**Step 1:** Change the worker runtime from one `source_uid` input to one `source_set_id` input.
**Step 2:** Load all ordered source-set members, validate them, and build one canonical internal consolidated markdown document.
**Step 3:** Add `loading_sources` and `consolidating` stages before the existing parse/index stages.
**Step 4:** Preserve source provenance in section/chunk metadata and final artifacts.
**Step 5:** Fail at `consolidating` for missing or invalid source members.

**Test command:** `cd services/platform-api && pytest -q tests/test_markdown_index_builder_pipeline.py tests/test_pipeline_multi_markdown_job.py tests/test_pipeline_worker.py`
**Expected output:** tests prove multi-file consolidation, source-order preservation, provenance mapping, and failure at `consolidating` when one member is invalid.

**Commit:** `feat: add multi-markdown pipeline consolidation`

## Task 5: Expand observability for source sets and true per-stage tracing

**File(s):** `services/platform-api/app/observability/pipeline_metrics.py`, `services/platform-api/app/observability/contract.py`, `services/platform-api/app/api/routes/pipelines.py`, `services/platform-api/app/pipelines/markdown_index_builder.py`

**Step 1:** Add source-set traces, counters, and structured logs.
**Step 2:** Emit one `pipeline.stage.execute` span per stage instead of one outer span for the whole processor.
**Step 3:** Record source-set member counts and new consolidation-stage durations.

**Test command:** `cd services/platform-api && pytest -q tests/test_pipeline_worker.py tests/test_pipelines_routes.py`
**Expected output:** observability tests and route tests confirm the locked names and stage behavior.

**Commit:** `feat: expand pipeline observability for source sets`

## Task 6: Bind the locked frontend workflow to source-set and job APIs

**File(s):** `web/src/pages/PipelineServicesPage.tsx`, `web/src/pages/usePipelineServicesWorkbench.tsx`, `web/src/components/pipelines/PipelineUploadPanel.tsx`, `web/src/components/pipelines/PipelineSourceFilesPanel.tsx`, `web/src/components/pipelines/PipelineSourceSetPanel.tsx`, `web/src/hooks/usePipelineSourceSet.ts`, `web/src/hooks/usePipelineJob.ts`, `web/src/lib/pipelineSourceSetService.ts`, `web/src/lib/pipelineService.ts`

**Step 1:** Keep `/app/pipeline-services/index-builder` as the mounted page and preserve the frontend contract from Task 1.
**Step 2:** Bind the uploaded markdown inventory and selected source set to the new source-set APIs.
**Step 3:** Trigger jobs from a selected source set, not from one selected source file.
**Step 4:** Bind the stage tracker to the canonical polled backend stage field.
**Step 5:** Bind deliverables and source-set context to successful completed jobs.

**Test command:** `cd web && npm run test -- --run src/pages/PipelineServicesPage.test.tsx src/components/pipelines/PipelineUploadPanel.test.tsx src/components/pipelines/PipelineSourceFilesPanel.test.tsx src/components/pipelines/PipelineSourceSetPanel.test.tsx src/hooks/usePipelineJob.test.ts src/lib/pipelineService.test.ts`
**Expected output:** UI tests prove visible multi-file state, source-set composition, manual trigger behavior, and correct status/deliverable rendering.

**Commit:** `feat: add multi-file pipeline services workflow`

## Task 7: Close route drift and end-to-end verification

**File(s):** `web/src/router.tsx`, `web/src/components/shell/nav-config.ts`, `web/src/components/shell/nav-config.test.ts`, `docs/plans/2026-03-30-pipeline-services-multi-markdown-source-sets-recovery-plan.md`

**Step 1:** Keep `/app/pipeline-services` canonical and `/app/rag` redirect-only.
**Step 2:** Verify the nav, breadcrumbs, and route tests match that contract.
**Step 3:** Run the locked backend and frontend test slices.
**Step 4:** Manually verify many-file upload, source-set creation, trigger, status progression, and deliverable download.

**Test command:** `cd services/platform-api && pytest -q tests/test_pipelines_routes.py tests/test_pipeline_source_sets_routes.py tests/test_markdown_index_builder_pipeline.py tests/test_pipeline_multi_markdown_job.py tests/test_pipeline_worker.py && cd E:\\writing-system\\web && npm run test -- --run src/pages/PipelineServicesPage.test.tsx src/components/pipelines/PipelineUploadPanel.test.tsx src/components/pipelines/PipelineSourceFilesPanel.test.tsx src/components/pipelines/PipelineSourceSetPanel.test.tsx src/components/shell/nav-config.test.ts`
**Expected output:** all targeted tests pass, `/app/pipeline-services/index-builder` is the primary surface, and the many-markdown flow is operational end-to-end.

**Commit:** `test: verify multi-markdown pipeline services recovery plan`
