# User Storage Namespace Separation and GCS Access Correction Implementation Plan

**Goal:** Correct the storage-surface leakage and GCS access failures across Assets, Pipeline Services, and future storage-owning surfaces by enforcing namespace-preserving behavior across object keys, metadata, queries, preview/download resolution, delete behavior, and quota accounting.

**Architecture:** Treat storage namespaces as first-class product boundaries. Keep shared storage plumbing in `storage_upload_reservations`, `storage_objects`, signed URL generation, quota accounting, and deletion primitives. Move user-facing metadata ownership back to the surface that owns it: Assets remains the owner of `source_documents`, while Pipeline Services gains a pipeline-owned source registry that is backed by `storage_objects` rather than `source_documents`. Preview/download resolution becomes shared GCS-first infrastructure through platform-api, and browser upload reliability is restored through explicit bucket CORS policy.

**Tech Stack:** FastAPI, Supabase Postgres migrations, Google Cloud Storage signed URLs, React + TypeScript + Vite, OpenTelemetry, pytest, Vitest.

**Status:** Draft  
**Date:** 2026-04-02

## Source of truth

This plan is derived from:

- `docs/plans/2026-04-02-storage-surface-separation-status-report.md`
- `docs/plans/2026-04-02-gcs-download-url-and-preview-resolver-migration-plan.md`
- the current `storage.py`, `pipelines.py`, `pipeline_source_sets.py`, `pipeline_storage.py`, and `storage_source_documents.py` runtime behavior
- the current Supabase storage, source-document, and pipeline schema as of 2026-04-02
- live browser verification of the Index Builder upload flow on `http://127.0.0.1:5374`

Execution note:

- This plan supersedes executing `2026-04-02-gcs-download-url-and-preview-resolver-migration-plan.md` as a standalone implementation plan, and that older draft must be marked `Superseded` before implementation begins.
- The status report remains a verified current-state input, not a separate execution artifact.

## Verified current state

### Storage object layer

- `services/platform-api/app/api/routes/storage.py` already writes distinct GCS object-key prefixes for Assets and Pipeline Services source uploads.
- Assets source uploads already land under an `assets` namespace.
- Pipeline Services source uploads already land under a `pipeline-services/{service_slug}` namespace.
- Separate GCS object-key prefixes therefore already exist at the physical object layer.

### Metadata bridge

- `services/platform-api/app/services/storage_source_documents.py` still upserts `source_documents` on `source_uid` alone.
- `source_uid` is content-addressed and reused across upload surfaces.
- `public.source_documents` therefore still acts as a shared cross-surface metadata sink.
- A live verification on `braintrust.md` showed two `storage_objects` rows with the same `source_uid` and different object keys, but only one `source_documents` row.
- The current collision is therefore not in GCS object storage. It is in the metadata bridge.

### Query layer

- Assets document listing still reads through `source_documents` and project-scoped document views.
- `GET /pipelines/{pipeline_kind}/sources` in `services/platform-api/app/api/routes/pipelines.py` still reads `source_documents` by `project_id` and then filters only by eligible source type.
- Index Builder therefore sees Assets-uploaded files when the shared `source_documents` row points at an Assets locator.
- Query-time leakage is real and currently expected from the present implementation.

### Pipeline dependency on `source_documents`

- Pipeline Services is not yet fully separated from `source_documents`.
- `public.pipeline_source_set_items.source_uid` currently references `public.source_documents(source_uid)`.
- `public.pipeline_jobs.source_uid` currently references `public.source_documents(source_uid)`.
- `services/platform-api/app/services/pipeline_source_sets.py` still loads source metadata from `source_documents`.
- `services/platform-api/app/services/pipeline_storage.py` still resolves markdown content through `source_documents` and then looks up the corresponding `storage_objects` row by locator.

### Upload and preview/download behavior

- Browser uploads still go directly from the web app to signed GCS `PUT` URLs.
- Live browser verification showed direct upload failure with a generic `Failed to fetch` error when uploading through the Index Builder source uploader.
- The failure mode is consistent with missing or incomplete bucket CORS configuration for browser-originated `PUT` uploads.
- Preview/download for `users/`-prefixed GCS locators is still incomplete because the frontend shared signed URL resolver is still oriented around Supabase Storage behavior and there is no platform-api `POST /storage/download-url` endpoint yet.

### Lifecycle correctness

- `storage_objects` is the quota-accounting source of truth and already tracks physical objects correctly enough for quota.
- `source_documents` collision can still leave the wrong surface metadata visible to user-facing queries.
- Namespace separation has therefore landed only at the physical-object layer, not at the metadata, query, or lifecycle layers.

## Pre-implementation contract

No major product, API, data-model, namespace, or observability decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

## Locked product decisions

1. This work is one coordinated corrective implementation, not three isolated fixes.
2. Storage namespaces are first-class architecture. Every storage-owning surface gets a reserved namespace, and that namespace must be preserved across object keys, metadata, queries, preview/download resolution, delete behavior, and quota accounting.
3. Separate GCS paths are not sufficient on their own. Metadata and query behavior must preserve the same separation.
4. Cross-surface reuse is explicit, never implicit. Shared `source_uid` values do not grant cross-surface visibility.
5. Assets remains the owner of the user-facing document model in `source_documents`.
6. Pipeline Services must stop using `source_documents` as the primary source library for source selection and source-object lookup.
7. Pipeline Services gains a pipeline-owned source registry backed by `storage_objects` and namespace metadata.
8. New Pipeline Services source uploads do not bridge into `source_documents` by default.
9. Existing pipeline dependencies on `source_documents` are migrated in this plan. They are not treated as an acceptable permanent seam.
10. Query-time prefix filtering alone is not an acceptable final fix.
11. `source_uid` remains content-addressed and globally stable in this batch. This plan does not broaden `source_uid` identity semantics.
12. Preview/download resolution is shared storage infrastructure. `users/` locators resolve through platform-api signed GCS access. Legacy `uploads/` locators continue through Supabase Storage until explicitly retired.
13. Direct browser upload to signed GCS URLs remains the upload model in this batch. This plan does not switch uploads to a proxy-upload backend path.
14. Browser upload reliability is incomplete until bucket CORS is explicitly configured for the real app origins.
15. Delete and quota correctness are part of the same correction. This plan is not complete if it fixes forward reads but leaves lifecycle mismatches unresolved.
16. Any new storage-owning surface added later must declare its namespace, metadata owner, default query boundary, preview/download path, delete behavior, quota behavior, and any explicit cross-surface reuse rule before implementation begins.

## Namespace model

### Surface-owned source namespaces

| Surface | Namespace shape | Default visibility |
| --- | --- | --- |
| Assets | `users/{user_id}/assets/projects/{project_id}/sources/{source_uid}/{filename}` | Assets only |
| Pipeline Services | `users/{user_id}/pipeline-services/{service_slug}/projects/{project_id}/sources/{source_uid}/{filename}` | The owning pipeline service only |

### Shared infrastructure namespaces

| Surface | Namespace shape | Notes |
| --- | --- | --- |
| Derived artifacts | `users/{user_id}/projects/{project_id}/sources/{source_uid}/{storage_kind}/{filename}` | Not listed as source inventory; preview/download still uses shared signed URL infrastructure |
| Legacy Supabase uploads | `uploads/{source_uid}/...` | Compatibility fallback only |

Namespace rule:

- A namespace behaves like a product-level directory boundary even though GCS implements it as an object-key prefix.

## Architecture

### Shared storage infrastructure

- upload reservation and completion
- object-key generation
- GCS signed upload/download URL generation
- `storage_objects` ownership
- quota accounting
- storage-object deletion primitives

### Surface-owned metadata

- Assets document listing and user-facing document lifecycle through `source_documents`
- Pipeline Services available-source listing, source-set membership, and source-content lookup through a new pipeline-owned source registry
- future storage-owning surfaces through their own declared metadata models

### Chosen corrective direction

- The target architecture follows the spirit of Option C from the status report.
- Not every upload becomes a `source_document`.
- Assets continues to own document-style metadata.
- Pipeline Services gets a dedicated metadata path and migrates off `source_documents`.
- A transitional compatibility seam is allowed only where needed to preserve historical rows and foreign-key migrations during this batch.

## Locked platform API surface

### Existing endpoints reused

- `POST /storage/uploads`
- `POST /storage/uploads/{reservation_id}/complete`
- `DELETE /storage/objects/{storage_object_id}`
- `GET /storage/quota`
- `GET /pipelines/{pipeline_kind}/sources`
- `GET /pipelines/{pipeline_kind}/source-sets`
- `POST /pipelines/{pipeline_kind}/source-sets`
- `PATCH /pipelines/{pipeline_kind}/source-sets/{source_set_id}`

### Modified endpoints

#### `POST /storage/uploads`

- Behavior change:
  - persist `storage_surface`
  - persist `storage_service_slug` when `storage_surface == 'pipeline-services'`
  - continue to accept `doc_title` and `source_type`
- Contract:
  - `storage_surface` becomes explicit and required for new source uploads
  - Assets source uploads use `storage_surface = 'assets'`
  - Pipeline Services source uploads use `storage_surface = 'pipeline-services'` plus `storage_service_slug`

#### `POST /storage/uploads/{reservation_id}/complete`

- Behavior change:
  - persist namespace metadata onto `storage_objects`
  - bridge to `source_documents` only when the completed upload belongs to the Assets surface
  - create or refresh pipeline-owned source-registry rows when the completed upload belongs to a Pipeline Services surface

#### `GET /pipelines/{pipeline_kind}/sources`

- Behavior change:
  - stop reading the source inventory from `source_documents`
  - read the source inventory from the pipeline-owned source registry
  - filter by owning pipeline kind or service slug, project, owner, and active storage object

#### `GET /pipelines/{pipeline_kind}/source-sets`

- Behavior change:
  - source-set items resolve through pipeline-owned source rows rather than through `source_documents`

#### `POST /pipelines/{pipeline_kind}/source-sets`

- Behavior change:
  - accept `pipeline_source_ids` instead of `source_uids`
  - validate ownership and eligibility against the pipeline-owned source registry

#### `PATCH /pipelines/{pipeline_kind}/source-sets/{source_set_id}`

- Behavior change:
  - accept `pipeline_source_ids` instead of `source_uids`
  - validate ownership and eligibility against the pipeline-owned source registry

#### `DELETE /storage/objects/{storage_object_id}`

- Behavior change:
  - remain the authoritative storage-object delete API
  - delete behavior becomes namespace-aware:
    - Assets deletes reconcile the linked `source_documents` row
    - Pipeline Services deletes reconcile the linked pipeline-owned source row and dependent records through the new registry-backed relationship

### New endpoint

| Verb | Path | Action |
| --- | --- | --- |
| POST | `/storage/download-url` | Issue an owned signed GCS `GET` URL for a `users/` locator through `storage_objects` ownership verification |

#### `POST /storage/download-url`

- Auth: `require_user_auth`
- Request:
  ```json
  {
    "object_key": "users/ae4c.../assets/projects/.../source/file.md"
  }
  ```
- Response:
  ```json
  {
    "signed_url": "https://storage.googleapis.com/...",
    "expires_in_seconds": 1800
  }
  ```
- Authorization rule:
  - verify `owner_user_id = auth.user_id`
  - verify `object_key = body.object_key`
  - verify `status = 'active'`
- Touches:
  - `public.storage_objects`

## Locked data model

### Existing tables modified

#### `public.storage_upload_reservations`

Add columns:

- `storage_surface TEXT NULL CHECK (storage_surface IN ('assets', 'pipeline-services'))`
- `storage_service_slug TEXT NULL`

Rules:

- new source-upload reservations must persist `storage_surface`
- `storage_service_slug` is required when `storage_surface = 'pipeline-services'`

#### `public.storage_objects`

Add columns:

- `storage_surface TEXT NULL CHECK (storage_surface IN ('assets', 'pipeline-services'))`
- `storage_service_slug TEXT NULL`
- `doc_title TEXT NULL`
- `source_type TEXT NULL`

Add indexes:

- `storage_objects_owner_project_surface_idx (owner_user_id, project_id, storage_surface, created_at desc)`
- `storage_objects_pipeline_surface_idx (owner_user_id, project_id, storage_surface, storage_service_slug, storage_kind, created_at desc)`

Rules:

- new source objects must persist surface metadata and source metadata
- derived objects may persist inherited namespace metadata where the source surface is known

#### `public.source_documents`

Add columns:

- `document_surface TEXT NULL CHECK (document_surface IN ('assets', 'pipeline-services'))`
- `storage_object_id UUID NULL REFERENCES public.storage_objects(storage_object_id) ON DELETE SET NULL`

Rules:

- Assets-owned `source_documents` rows persist `document_surface = 'assets'`
- historical pipeline-origin `source_documents` rows may be backfilled as `document_surface = 'pipeline-services'` for compatibility during migration
- new pipeline source uploads do not create new `source_documents` rows

### New table required

#### `public.pipeline_sources`

Required columns:

- `pipeline_source_id UUID PRIMARY KEY`
- `owner_id UUID NOT NULL`
- `project_id UUID NOT NULL`
- `pipeline_kind TEXT NOT NULL`
- `storage_service_slug TEXT NOT NULL`
- `storage_object_id UUID NOT NULL REFERENCES public.storage_objects(storage_object_id) ON DELETE CASCADE`
- `source_uid TEXT NOT NULL`
- `doc_title TEXT NOT NULL`
- `source_type TEXT NOT NULL`
- `byte_size BIGINT NULL`
- `object_key TEXT NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Required constraints:

- unique `(pipeline_kind, storage_object_id)`
- unique `(owner_id, project_id, pipeline_kind, source_uid)`

Required indexes:

- `pipeline_sources_owner_project_kind_idx (owner_id, project_id, pipeline_kind, created_at desc)`
- `pipeline_sources_object_idx (storage_object_id)`

### Existing pipeline tables migrated

#### `public.pipeline_source_set_items`

Add columns:

- `pipeline_source_id UUID NULL REFERENCES public.pipeline_sources(pipeline_source_id) ON DELETE CASCADE`

Schema change:

- remove the `source_uid -> source_documents(source_uid)` foreign-key dependency
- retain `source_uid` as a denormalized compatibility field in this batch
- make `pipeline_source_id` the authoritative relationship for new rows

#### `public.pipeline_jobs`

Add columns:

- `pipeline_source_id UUID NULL REFERENCES public.pipeline_sources(pipeline_source_id) ON DELETE CASCADE`

Schema change:

- remove the `source_uid -> source_documents(source_uid)` foreign-key dependency
- retain `source_uid` as a denormalized compatibility field in this batch
- make `pipeline_source_id` the authoritative relationship for new rows

### Explicit decisions

- This plan does not make `source_uid` surface-scoped.
- This plan does not turn `source_documents` into a permanent composite-key multi-surface registry.
- This plan does not leave Pipeline Services permanently attached to `source_documents`.

## Locked query behavior

1. Assets listings must show Assets-owned documents only.
2. Pipeline Services source listings must show Pipeline Services sources for the active pipeline kind only.
3. Shared storage infrastructure may reuse `storage_objects`, but user-facing source inventory does not cross namespaces by default.
4. Historical `source_documents.document_surface = 'pipeline-services'` rows are excluded from Assets listings.
5. Prefix filtering may be used as a temporary remediation check during migration or verification, but it is not the final architecture.

## Locked preview/download behavior

1. The single frontend signed URL choke point remains `createSignedUrlForLocator` in `web/src/lib/projectDetailHelpers.ts`.
2. `users/` locators resolve through platform-api `POST /storage/download-url`.
3. `uploads/` locators continue to resolve through Supabase Storage as a legacy fallback.
4. `Upload.tsx` duplicate signed URL logic is removed and replaced with the shared helper.
5. `ParseTabPanel.tsx` direct Supabase signed URL calls are removed and replaced with the shared helper.
6. GCS preview/download is considered incomplete until both the backend endpoint and the frontend shared resolver migration land.

## GCS/browser policy and operational config

### Locked operational rules

1. Bucket CORS configuration is part of the implementation, not a post-hoc ops note.
2. The repo must carry a checked-in CORS policy artifact for the user-storage bucket.
3. Direct browser `PUT` uploads to signed GCS URLs require explicit allowed origins.
4. Direct browser `GET` downloads through signed GCS URLs must also be covered by the same operational policy.
5. Wildcard origins are not allowed in this batch.
6. Exact deployed app origins must be verified before applying the bucket policy. They must not be guessed in implementation.

### Minimum dev-origin expectations

- `http://127.0.0.1:5374`
- `http://localhost:5374`
- `http://127.0.0.1:5375`
- `http://localhost:5375`

### Minimum method and header expectations

- methods: `PUT`, `GET`, `HEAD`, `OPTIONS`
- response headers: `Content-Type`, `Content-Disposition`, `ETag`, `x-goog-resumable`

### Implementation requirement

- If the bucket CORS policy is not applied and verified against the real app origins, browser upload work is not complete even if the code compiles.

## Delete/quota contract

1. `storage_objects` remains the quota-accounting source of truth.
2. Namespace separation must not break quota correctness.
3. Namespace-aware deletion must reconcile the surface-owned metadata row that points at the physical object being deleted.
4. This plan does not introduce a second quota ledger.
5. Existing direct frontend object deletion paths that bypass platform-api remain out of scope for product expansion, but the implementation must verify that the authoritative platform-api delete behavior is namespace-correct.

## Locked observability surface

### New metrics and tracing

| Type | Name | Where | Purpose |
| --- | --- | --- | --- |
| Trace span | `storage.download.sign_url` | `services/platform-api/app/api/routes/storage.py` | Measure download URL generation latency and success/failure |
| Counter | `platform.storage.download.sign_url.count` | `services/platform-api/app/observability/storage_metrics.py` | Count successful signed download URL requests |
| Counter | `platform.storage.download.sign_url.failure.count` | `services/platform-api/app/observability/storage_metrics.py` | Count failed signed download URL requests |
| Histogram | `platform.storage.download.sign_url.duration_ms` | `services/platform-api/app/observability/storage_metrics.py` | Measure download URL generation latency distribution |

### Existing spans updated with safe attributes

- storage upload reserve
- storage upload complete
- pipeline source list
- pipeline source-set create/update

Allowed new attributes:

- `result`
- `storage_surface`
- `storage_service_slug_present`
- `pipeline_kind`
- `row_count`
- `http.status_code`
- `has_object`

Forbidden attributes:

- raw `object_key`
- raw signed URLs
- raw `user_id`
- raw `source_uid`

## Database migrations

### Execution sequencing

- Migration 1 and Migration 2 are the initial schema batch for Task 1.
- Migration 3 is intentionally deferred until after Task 2 and Task 3 are implemented and verified against the Migration 1 and Migration 2 schema.
- Migration 3 is not part of the initial schema-creation batch. It is the later backfill and reconciliation batch for historical rows.

### Migration 1

- Filename: `supabase/migrations/20260402193000_storage_namespace_metadata_foundation.sql`
- Schema effect:
  - add `storage_surface` and `storage_service_slug` to `public.storage_upload_reservations`
  - add `storage_surface`, `storage_service_slug`, `doc_title`, and `source_type` to `public.storage_objects`
  - add `document_surface` and `storage_object_id` to `public.source_documents`
  - add the new namespace-aware indexes defined in the locked data model
- Data impact:
  - no rows change ownership yet
  - existing rows become eligible for namespace backfill in later migrations

### Migration 2

- Filename: `supabase/migrations/20260402194000_pipeline_source_registry_and_fk_migration.sql`
- Schema effect:
  - create `public.pipeline_sources`
  - add `pipeline_source_id` to `public.pipeline_source_set_items`
  - add `pipeline_source_id` to `public.pipeline_jobs`
  - remove the direct `source_uid -> public.source_documents(source_uid)` foreign-key dependency from the pipeline-owned tables
  - add the new `pipeline_sources` indexes and uniqueness constraints defined in the locked data model
- Data impact:
  - no user-facing inventory changes yet
  - pipeline tables become ready for registry-backed backfill

### Migration 3

- Filename: `supabase/migrations/20260402195000_storage_namespace_backfill_and_source_document_reconciliation.sql`
- Prerequisites:
  - `20260402193000_storage_namespace_metadata_foundation.sql` is applied
  - `20260402194000_pipeline_source_registry_and_fk_migration.sql` is applied
  - Task 2 and Task 3 forward-write behavior is implemented and verified locally
- Schema effect:
  - no new tables or columns beyond the prior migration pair
  - data-reconciliation statements only; no open-ended helper SQL is part of this migration contract
- Data impact:
  - backfill `storage_surface` and `storage_service_slug` onto existing `storage_upload_reservations` and `storage_objects` using the locked namespace rules already defined by object-key prefixes
  - backfill `storage_object_id` and `document_surface = 'assets'` onto existing Assets-owned `source_documents` rows where a matching owned storage object exists
  - create `pipeline_sources` rows for existing Pipeline Services source objects
  - populate `pipeline_source_id` onto existing `pipeline_source_set_items` and `pipeline_jobs` rows from those pipeline-owned source rows
  - reconcile historical pipeline-origin compatibility `source_documents` rows so Assets queries can exclude them cleanly after the backfill lands

## Edge functions

- No new edge functions are created in this plan.
- No existing edge functions are modified as part of the locked implementation inventory.
- Existing Supabase edge functions that still depend on `source_documents` are treated as compatibility constraints to be audited in Task 0, not as implementation targets in this plan.

## Frontend surface area

### Runtime manifest

| File | Type | Surface / mount point | Responsibility |
| --- | --- | --- | --- |
| `web/src/lib/storageUploadService.ts` | shared upload lib | Assets upload flows and any direct signed-upload caller | Persists explicit `storage_surface`, preserves direct-upload semantics, and maps bucket-policy failures to clearer user-facing errors |
| `web/src/lib/pipelineService.ts` | pipeline client lib | Index Builder and future pipeline-service upload/list/save flows | Sends `storage_surface = 'pipeline-services'`, consumes pipeline-owned source inventory, and saves source sets by `pipeline_source_id` |
| `web/src/lib/projectDetailHelpers.ts` | shared preview/download lib | All preview/download consumers routed through the shared signed URL helper | Resolves `users/` locators through platform-api and preserves legacy `uploads/` fallback |
| `web/src/lib/projectDocuments.ts` | Assets data client | Assets document list and document-centric consumers | Enforces Assets-only listing behavior against the corrected metadata contract |
| `web/src/hooks/useProjectDocuments.ts` | Assets hook | Assets page document inventory | Reads the Assets-only document surface and excludes pipeline-origin compatibility rows |
| `web/src/hooks/usePipelineSourceSet.ts` | Index Builder hook | Index Builder draft/save/update flows | Tracks selected pipeline-owned sources, not shared `source_documents` rows |
| `web/src/pages/Upload.tsx` | page | Upload page preview path | Removes duplicate signed URL logic and inherits the shared GCS-first resolver |
| `web/src/components/documents/ParseTabPanel.tsx` | component | Parse/detail JSON preview and download actions | Stops bypassing the shared signed URL resolver and uses the common preview/download path |

### Test surface

- `web/src/lib/storageUploadService.test.ts` verifies surface-aware upload payloads and clearer upload error mapping.
- `web/src/lib/pipelineService.test.ts` verifies pipeline-owned source inventory and `pipeline_source_id` request shapes.
- `web/src/pages/ProjectAssetsPage.test.tsx` verifies Assets listing remains namespace-scoped.
- `web/src/hooks/usePipelineSourceSet.test.ts` verifies Index Builder save/update behavior against the pipeline-owned source contract.
- `web/src/lib/projectDetailHelpers.test.ts` verifies GCS `users/` locator resolution and legacy `uploads/` fallback.
- `web/src/pages/Upload.test.tsx` verifies the page now uses the shared signed URL resolver.
- `web/src/components/documents/ParseTabPanel.test.tsx` verifies JSON preview/download uses the shared resolver for both GCS and legacy locators.

## Locked inventory counts

### Backend and database

- Modified existing backend runtime files: `6`
- New backend runtime files: `2`
- Modified existing backend test files: `4`
- New backend test files: `2`
- New migration files: `3`
- New ops/config files: `2`

### Frontend

- Modified existing frontend lib files: `4`
- Modified existing frontend hook files: `2`
- Modified existing frontend page/component files: `2`
- Modified existing frontend test files: `4`
- New frontend test files: `3`
- New frontend runtime files: `0`

## Locked file inventory

### Modified backend runtime files

- `services/platform-api/app/api/routes/storage.py`
- `services/platform-api/app/api/routes/pipelines.py`
- `services/platform-api/app/services/storage_source_documents.py`
- `services/platform-api/app/services/pipeline_source_sets.py`
- `services/platform-api/app/services/pipeline_storage.py`
- `services/platform-api/app/observability/storage_metrics.py`

### New backend runtime files

- `services/platform-api/app/services/storage_namespaces.py`
- `services/platform-api/app/services/pipeline_source_library.py`

### Modified backend test files

- `services/platform-api/tests/test_storage_routes.py`
- `services/platform-api/tests/test_pipelines_routes.py`
- `services/platform-api/tests/test_pipeline_source_sets_service.py`
- `services/platform-api/tests/test_storage_source_documents.py`

### New backend test files

- `services/platform-api/tests/test_storage_download_url.py`
- `services/platform-api/tests/test_pipeline_source_library.py`

### New migration files

- `supabase/migrations/20260402193000_storage_namespace_metadata_foundation.sql`
- `supabase/migrations/20260402194000_pipeline_source_registry_and_fk_migration.sql`
- `supabase/migrations/20260402195000_storage_namespace_backfill_and_source_document_reconciliation.sql`

### Modified frontend runtime files

- `web/src/lib/storageUploadService.ts`
- `web/src/lib/pipelineService.ts`
- `web/src/lib/projectDetailHelpers.ts`
- `web/src/lib/projectDocuments.ts`
- `web/src/hooks/useProjectDocuments.ts`
- `web/src/hooks/usePipelineSourceSet.ts`
- `web/src/pages/Upload.tsx`
- `web/src/components/documents/ParseTabPanel.tsx`

### Modified frontend test files

- `web/src/lib/storageUploadService.test.ts`
- `web/src/lib/pipelineService.test.ts`
- `web/src/pages/ProjectAssetsPage.test.tsx`
- `web/src/hooks/usePipelineSourceSet.test.ts`

### New frontend test files

- `web/src/lib/projectDetailHelpers.test.ts`
- `web/src/pages/Upload.test.tsx`
- `web/src/components/documents/ParseTabPanel.test.tsx`

### New ops/config files

- `ops/gcs/user-storage-cors.json`
- `docs/ops/storage-namespace-and-gcs-policy-runbook.md`

## Frozen seam contract

### Authoritative seams that remain in place

- `build_object_key()` in `services/platform-api/app/api/routes/storage.py` remains the object-key formatter authority.
- `storage_objects` remains the physical object and quota ledger.
- `createSignedUrlForLocator()` remains the frontend preview/download choke point.
- `GET /storage/quota` remains unchanged.
- Legacy `uploads/` locators remain readable through the existing Supabase Storage fallback until explicitly retired.

### Seams that are frozen only as migration compatibility

- `source_uid` remains a content-addressed compatibility field in pipeline rows during this batch.
- historical pipeline-origin `source_documents` rows may remain temporarily for compatibility and remediation, but they are not the forward write path for Pipeline Services.

## Explicit risks accepted in this plan

1. `source_documents` has a wider blast radius than the original status report implied. Many edge functions, parsing flows, and pipeline tables depend on it today.
2. The pipeline migration from `source_documents` to a pipeline-owned source registry may expose historical rows that need compatibility handling rather than immediate deletion.
3. Exact production origins for bucket CORS were not verified in this investigation. The implementation must verify them before applying the real policy.
4. Some GCS-backed artifact locators may still lack a `storage_objects` row. The implementation must audit current locator-emitting write paths before claiming full preview/download coverage.

## Task breakdown

### Task 0: Audit the remaining seams that affect the corrective plan

Files:

- `services/platform-api/app/api/routes/storage.py`
- `services/platform-api/app/api/routes/pipelines.py`
- `services/platform-api/app/services/pipeline_storage.py`
- `supabase/functions/**/*`
- `docs/ops/storage-namespace-and-gcs-policy-runbook.md`

Steps:

1. Enumerate all current GCS locator-emitting write paths.
2. Verify which ones already create `storage_objects` rows.
3. Verify the exact deployed app origins that need bucket CORS coverage.
4. Record any locator-emitting path that cannot be covered by the locked signed-download contract.

Test command:

- `cd services/platform-api && pytest -q tests/test_storage_routes.py tests/test_pipelines_routes.py`

Expected output:

- Existing storage and pipeline route tests still pass before the corrective changes start, and the implementation inventory is confirmed against the live codebase.

Commit message:

- `chore(storage): audit namespace and gcs access seams`

### Task 1: Add namespace metadata and pipeline-source registry schema

Files:

- `supabase/migrations/20260402193000_storage_namespace_metadata_foundation.sql`
- `supabase/migrations/20260402194000_pipeline_source_registry_and_fk_migration.sql`

Steps:

1. Add namespace metadata columns to `storage_upload_reservations`, `storage_objects`, and `source_documents`.
2. Create `pipeline_sources`.
3. Add `pipeline_source_id` columns and foreign keys to pipeline tables.
4. Remove the direct pipeline-table foreign-key dependency on `source_documents`.

Test command:

- `cd services/platform-api && pytest -q tests/test_storage_source_documents.py tests/test_pipeline_source_sets_service.py`

Expected output:

- Pytest passes with the new schema assumptions covered by migration and service-level tests.

Commit message:

- `feat(storage): add namespace metadata and pipeline source registry schema`

### Task 2: Persist namespace metadata through storage upload completion

Files:

- `services/platform-api/app/api/routes/storage.py`
- `services/platform-api/app/services/storage_source_documents.py`
- `services/platform-api/app/services/storage_namespaces.py`
- `services/platform-api/tests/test_storage_routes.py`
- `services/platform-api/tests/test_storage_source_documents.py`

Steps:

1. Centralize namespace parsing and validation in a storage namespace helper.
2. Persist `storage_surface`, `storage_service_slug`, `doc_title`, and `source_type` onto `storage_objects` during completion.
3. Restrict the `source_documents` bridge to Assets-owned source uploads.
4. Create or refresh `pipeline_sources` rows for Pipeline Services source uploads.
5. Preserve duplicate recovery and quota semantics.

Test command:

- `cd services/platform-api && pytest -q tests/test_storage_routes.py -k "uploads or finalize or bridge"`

Expected output:

- Pytest passes with Assets uploads bridging to `source_documents`, Pipeline Services uploads creating pipeline-owned source rows, and namespace metadata persisting correctly.

Commit message:

- `feat(storage): persist namespace metadata and gate source document bridge`

### Task 3: Migrate Pipeline Services source listing and source-set logic to the pipeline-owned registry

Files:

- `services/platform-api/app/api/routes/pipelines.py`
- `services/platform-api/app/services/pipeline_source_sets.py`
- `services/platform-api/app/services/pipeline_source_library.py`
- `services/platform-api/app/services/pipeline_storage.py`
- `services/platform-api/tests/test_pipelines_routes.py`
- `services/platform-api/tests/test_pipeline_source_sets_service.py`
- `services/platform-api/tests/test_pipeline_source_library.py`

Steps:

1. Replace `_query_project_sources()` over `source_documents` with pipeline-owned source queries.
2. Change source-set create/update validation to accept `pipeline_source_ids`.
3. Make pipeline markdown loading resolve through pipeline-owned source rows and `storage_objects`.
4. Preserve eligible source-type filtering and owner/project scoping.
5. Stop using `source_documents` as the primary Pipeline Services source library.

Test command:

- `cd services/platform-api && pytest -q tests/test_pipelines_routes.py tests/test_pipeline_source_sets_service.py tests/test_pipeline_source_library.py`

Expected output:

- Pytest passes with Index Builder source listing scoped to the pipeline namespace, source-set create/update using `pipeline_source_ids`, and markdown loading resolved through pipeline-owned source rows.

Commit message:

- `feat(pipelines): move source inventory to pipeline-owned registry`

### Task 4: Update the Index Builder frontend to the pipeline-owned source contract

Files:

- `web/src/lib/pipelineService.ts`
- `web/src/hooks/usePipelineSourceSet.ts`
- `web/src/lib/pipelineService.test.ts`
- `web/src/hooks/usePipelineSourceSet.test.ts`

Steps:

1. Change source list types to include `pipeline_source_id`.
2. Change source-set create/update requests to send `pipeline_source_ids`.
3. Preserve the existing workbench selection behavior and URL-backed job flow.
4. Verify that Assets files no longer appear in the Index Builder source list by default.

Test command:

- `cd web && npx vitest run src/lib/pipelineService.test.ts src/hooks/usePipelineSourceSet.test.ts`

Expected output:

- Vitest passes with source list parsing, source-set save/update requests, and namespace-separated source inventory behavior covered.

Commit message:

- `feat(index-builder): adopt pipeline-owned source ids`

### Task 5: Add shared GCS download and preview resolution

Files:

- `services/platform-api/app/api/routes/storage.py`
- `services/platform-api/app/observability/storage_metrics.py`
- `services/platform-api/tests/test_storage_download_url.py`
- `web/src/lib/projectDetailHelpers.ts`
- `web/src/pages/Upload.tsx`
- `web/src/components/documents/ParseTabPanel.tsx`
- `web/src/lib/projectDetailHelpers.test.ts`
- `web/src/pages/Upload.test.tsx`
- `web/src/components/documents/ParseTabPanel.test.tsx`

Steps:

1. Add `POST /storage/download-url` with ownership verification through `storage_objects`.
2. Add download signed URL metrics and tracing.
3. Route `users/` locators through platform-api from the shared frontend resolver.
4. Preserve Supabase Storage fallback for legacy `uploads/` locators.
5. Remove duplicate and bypass signed URL logic from `Upload.tsx` and `ParseTabPanel.tsx`.

Test command:

- `cd services/platform-api && pytest -q tests/test_storage_download_url.py`
- `cd web && npx vitest run src/lib/projectDetailHelpers.test.ts src/pages/Upload.test.tsx src/components/documents/ParseTabPanel.test.tsx`

Expected output:

- Backend and frontend tests pass with GCS `users/` locators resolving through platform-api, and legacy `uploads/` locators still working through Supabase Storage.

Commit message:

- `feat(storage): add shared gcs download and preview resolution`

### Task 6: Add bucket CORS policy artifacts and restore browser upload reliability

Files:

- `ops/gcs/user-storage-cors.json`
- `docs/ops/storage-namespace-and-gcs-policy-runbook.md`
- `web/src/lib/storageUploadService.ts`
- `web/src/lib/storageUploadService.test.ts`

Steps:

1. Check in the bucket CORS policy artifact for the user-storage bucket.
2. Document the exact apply/verify commands and required origins.
3. Improve frontend upload error handling so bucket-policy failures do not surface only as raw `Failed to fetch`.
4. Verify browser upload success after the policy is applied.

Test command:

- `cd web && npx vitest run src/lib/storageUploadService.test.ts`

Expected output:

- Vitest passes with direct-upload error mapping covered, and manual verification confirms browser uploads succeed after the bucket policy is applied.

Commit message:

- `fix(storage): add bucket cors policy and upload error handling`

### Task 7: Reconcile lifecycle correctness for historical rows and deletion

Files:

- `supabase/migrations/20260402195000_storage_namespace_backfill_and_source_document_reconciliation.sql`
- `services/platform-api/app/api/routes/storage.py`
- `services/platform-api/app/api/routes/pipelines.py`
- `services/platform-api/tests/test_storage_routes.py`
- `services/platform-api/tests/test_pipelines_routes.py`
- `web/src/lib/projectDocuments.ts`
- `web/src/hooks/useProjectDocuments.ts`
- `web/src/pages/ProjectAssetsPage.test.tsx`

Steps:

1. Author and apply `20260402195000_storage_namespace_backfill_and_source_document_reconciliation.sql` only after Task 2 and Task 3 verification proves the forward-write paths are correct.
2. Exclude pipeline-origin compatibility rows from Assets listings.
3. Verify that deleting an Assets-backed object reconciles the correct `source_documents` row.
4. Verify that deleting a Pipeline Services-backed object reconciles the correct pipeline-owned source row.
5. Verify quota remains accurate after delete and remediation.
6. Verify historical pipeline rows no longer leak into Assets or Index Builder source inventory.

Test command:

- `cd services/platform-api && pytest -q tests/test_storage_routes.py tests/test_pipelines_routes.py`
- `cd web && npx vitest run src/pages/ProjectAssetsPage.test.tsx`

Expected output:

- The deferred backfill migration applies cleanly, and tests pass with historical compatibility rows filtered correctly, namespace-aware deletion working, and quota behavior unchanged.

Commit message:

- `fix(storage): apply namespace backfill and reconcile legacy rows`

### Task 8: Full verification sweep

Test commands:

- `cd services/platform-api && pytest -q tests/test_storage_routes.py tests/test_storage_source_documents.py tests/test_storage_download_url.py tests/test_pipelines_routes.py tests/test_pipeline_source_sets_service.py tests/test_pipeline_source_library.py`
- `cd web && npx vitest run src/lib/storageUploadService.test.ts src/lib/pipelineService.test.ts src/lib/projectDetailHelpers.test.ts src/hooks/usePipelineSourceSet.test.ts src/pages/ProjectAssetsPage.test.tsx src/pages/Upload.test.tsx src/components/documents/ParseTabPanel.test.tsx`
- `cd web && npm run build`

Manual verification:

1. Upload a document through Assets and verify it appears in Assets but not in Index Builder source inventory.
2. Upload a document through Index Builder and verify it appears in Index Builder but not in Assets.
3. Save and reopen an Index Builder draft and verify selected pipeline sources remain stable.
4. Preview and download a GCS-backed file through a `users/` locator.
5. Preview and download a legacy Supabase-backed file through an `uploads/` locator.
6. Verify browser upload no longer fails with raw `Failed to fetch`.
7. Delete one Assets-backed object and one Pipeline Services-backed object and verify the correct metadata rows disappear while quota remains correct.

Expected output:

- All targeted pytest and Vitest commands pass, the web build succeeds, and the manual flows confirm namespace-preserving behavior across upload, listing, preview/download, delete, and quota.

Commit message:

- `test(storage): verify namespace separation and gcs access correction`

## Locked acceptance contract

1. Assets-uploaded files do not appear in the Index Builder source list by default.
2. Pipeline Services-uploaded files do not appear in Assets by default.
3. New Pipeline Services source uploads do not create `source_documents` rows.
4. Assets uploads continue to create `source_documents` rows.
5. `GET /pipelines/{pipeline_kind}/sources` is namespace-scoped and does not read from `source_documents` as its source inventory.
6. Pipeline source-set create/update uses `pipeline_source_ids`.
7. A GCS-backed `users/` locator previews and downloads through platform-api signed URL resolution.
8. A legacy `uploads/` locator still previews and downloads through Supabase Storage.
9. Browser upload to signed GCS URLs succeeds after the checked-in CORS policy is applied.
10. Namespace-aware deletion reconciles the correct metadata row and leaves quota accounting correct.
11. The implementation does not rely on query-time prefix filtering alone as the final fix.

## Completion criteria

The work is complete only when all of the following are true:

1. Storage namespaces are preserved consistently across object keys, metadata, queries, preview/download resolution, delete behavior, and quota accounting.
2. Assets remains the owner of `source_documents`.
3. Pipeline Services has a pipeline-owned source registry backed by `storage_objects`.
4. New Pipeline Services uploads no longer bridge into `source_documents`.
5. Index Builder source selection is fully namespace-separated from Assets.
6. GCS preview/download works through shared platform-api infrastructure.
7. Browser upload no longer fails because bucket CORS was omitted.
8. Historical collision fallout is reconciled enough that user-facing listings are clean and lifecycle behavior is correct going forward.
9. The locked acceptance contract, inventory counts, and task breakdown remain true to the implemented change set.
