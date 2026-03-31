# Storage Quota Assets And Pipeline Services Accounting Implementation Plan

This plan addresses two verified problems in the current storage implementation:

1. platform-api already supports two upload surfaces, `assets` and `pipeline-services`, but the quota read contract only returns one aggregate row and does not expose per-surface usage
2. the current quota display and accounting path can show incorrect remaining storage because `storage_quotas` can drift from the authoritative `storage_objects` and `storage_upload_reservations` state

This plan is intentionally backend-first. The user asked for specific platform-api evidence and a plan that includes concrete implementation detail. The evidence below proves both upload paths already exist and already consume the shared user quota domain.

## Plan Header

**Goal**

Establish authoritative per-surface user storage accounting for Assets and Pipeline Services without changing the shared signed-upload control plane.

**Architecture**

- `platform-api` remains the single storage control plane for Assets and Pipeline Services uploads.
- Storage surface identity becomes first-class persistence on `storage_upload_reservations` and `storage_objects` instead of living only inside `object_key`.
- `GET /storage/quota` moves from aggregate-row reads to an authoritative RPC-backed breakdown response.
- The frontend remains read-only against `/storage/quota`; it renders the expanded response but does not introduce a second accounting path.
- OTEL keeps the current storage route and metric names, but expands the attribute contract so the new surface accounting is visible in the existing storage seam.

**Tech Stack**

- FastAPI `platform-api`
- Supabase Postgres migrations and RPCs
- Google Cloud Storage signed uploads
- React + Vite frontend

## Confirmed Existing Platform-API Evidence

### Evidence 1: platform-api explicitly supports two upload surfaces

[`services/platform-api/app/api/routes/storage.py`](/e:/writing-system/services/platform-api/app/api/routes/storage.py)

```py
StorageSurface = Literal["assets", "pipeline-services"]

def build_object_key(
    *,
    user_id: str,
    project_id: str,
    filename: str,
    storage_kind: StorageKind,
    source_uid: str | None = None,
    upload_id: str | None = None,
    artifact_name: str | None = None,
    storage_surface: StorageSurface | None = None,
    storage_service_slug: str | None = None,
) -> str:
    safe_filename = _safe_object_name(filename)
    safe_project_id = _safe_path_segment(project_id, field_name="project_id")

    if storage_kind == "source":
        safe_source_uid = _safe_path_segment(source_uid, field_name="source_uid")
        artifact = _safe_object_name(artifact_name or safe_filename)
        surface = storage_surface or "assets"
        if surface == "assets":
            return (
                f"users/{user_id}/assets/projects/{safe_project_id}/sources/{safe_source_uid}/"
                f"{storage_kind}/{artifact}"
            )
        safe_service_slug = _safe_path_segment(storage_service_slug, field_name="storage_service_slug")
        return (
            f"users/{user_id}/pipeline-services/{safe_service_slug}/projects/{safe_project_id}/"
            f"sources/{safe_source_uid}/{storage_kind}/{artifact}"
        )
```

This is direct backend proof that source uploads already have two path families:

- `users/{user_id}/assets/projects/...`
- `users/{user_id}/pipeline-services/{service_slug}/projects/...`

### Evidence 2: the Assets upload path uses the shared storage control plane

[`web/src/hooks/useDirectUpload.ts`](/e:/writing-system/web/src/hooks/useDirectUpload.ts)

```ts
async function uploadOneFile(
  file: File,
  projectId: string,
): Promise<{ source_uid?: string }> {
  const result = await uploadWithReservation({
    projectId,
    file,
    docTitle: file.name,
  });
  return {
    source_uid: result.sourceUid,
  };
}
```

[`web/src/lib/storageUploadService.ts`](/e:/writing-system/web/src/lib/storageUploadService.ts)

```ts
export async function uploadWithReservation(params: {
  projectId: string;
  file: File;
  docTitle?: string;
}): Promise<UploadWithReservationResult> {
  const prepared = await prepareSourceUpload(params.file, { docTitle: params.docTitle });
  const reservation = await reserveUploadWithConflictRecovery(() => (
    postUploadApiJson<UploadReservation>('/storage/uploads', {
      project_id: params.projectId,
      ...prepared,
    })
  ));

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(reservation.signed_upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': prepared.content_type },
      body: params.file,
    });
  } catch (error) {
    await cancelUploadReservation(reservation.reservation_id);
    throw error;
  }

  if (!uploadResponse.ok) {
    await cancelUploadReservation(reservation.reservation_id);
    throw new Error(`signed upload failed: ${uploadResponse.status}`);
  }

  const completed = await postUploadApiJson<CompletedUpload>(
    `/storage/uploads/${reservation.reservation_id}/complete`,
    { actual_bytes: params.file.size },
    'storage upload completion failed',
  );

  return {
    sourceUid: prepared.source_uid,
    reservation,
    completed,
  };
}
```

This is direct frontend proof that Assets uploads use the same `/storage/uploads` and `/storage/uploads/{reservation_id}/complete` platform-api surface.

Because `storage_surface` is omitted here, the backend defaults it to `assets`.

### Evidence 3: the Pipeline Services upload path uses the same shared storage control plane

[`web/src/lib/pipelineService.ts`](/e:/writing-system/web/src/lib/pipelineService.ts)

```ts
async function reservePipelineUpload(params: {
  projectId: string;
  prepared: PreparedSourceUpload;
  serviceSlug: string;
}): Promise<UploadReservation> {
  return reserveUploadWithConflictRecovery(() => (
    postUploadApiJson<UploadReservation>(
      '/storage/uploads',
      {
        project_id: params.projectId,
        ...params.prepared,
        storage_surface: 'pipeline-services',
        storage_service_slug: params.serviceSlug,
      },
      'pipeline upload reservation failed',
    )
  ));
}

export async function uploadPipelineSource(params: {
  projectId: string;
  serviceSlug: string;
  file: File;
  docTitle?: string;
}): Promise<PipelineUploadResult> {
  const prepared = await prepareSourceUpload(params.file, { docTitle: params.docTitle });
  const reservation = await reservePipelineUpload({
    projectId: params.projectId,
    prepared,
    serviceSlug: params.serviceSlug,
  });
```

This is direct proof that Pipeline Services uploads do not bypass user storage. They use the same signed-URL reservation flow as Assets, but with `storage_surface: 'pipeline-services'`.

### Evidence 4: completed uploads from both paths bridge into `source_documents`

[`services/platform-api/app/services/storage_source_documents.py`](/e:/writing-system/services/platform-api/app/services/storage_source_documents.py)

```py
def upsert_source_document_for_storage_object(
    supabase_admin,
    *,
    owner_id: str,
    project_id: str | None,
    source_uid: str,
    source_type: str,
    doc_title: str,
    object_key: str,
    bytes_used: int,
) -> None:
    payload = {
        "source_uid": source_uid,
        "owner_id": owner_id,
        "project_id": project_id,
        "source_type": source_type,
        "source_filesize": bytes_used,
        "source_total_characters": None,
        "source_locator": object_key,
        "doc_title": doc_title,
        "status": "uploaded",
        "conversion_job_id": None,
        "error": None,
    }

    supabase_admin.table("source_documents").upsert(payload, on_conflict="source_uid").execute()
```

This means both path families eventually become first-class source documents, because the `object_key` for both surfaces is bridged into `source_documents.source_locator`.

### Evidence 5: the current quota read contract is aggregate-only

[`services/platform-api/app/api/routes/storage.py`](/e:/writing-system/services/platform-api/app/api/routes/storage.py)

```py
@router.get("/quota")
async def read_storage_quota(auth=Depends(require_user_auth)):
    with storage_tracer.start_as_current_span("storage.quota.read"):
        admin = get_supabase_admin()
        try:
            result = (
                admin.table("storage_quotas")
                .select("*")
                .eq("user_id", auth.user_id)
                .maybe_single()
                .execute()
            )
            if not result.data:
                raise HTTPException(status_code=404, detail="Quota not provisioned")
            record_storage_quota_read(
                result="ok",
                quota_bytes=result.data.get("quota_bytes"),
                used_bytes=result.data.get("used_bytes"),
                reserved_bytes=result.data.get("reserved_bytes"),
                http_status_code=200,
            )
            return result.data
```

This proves the current platform-api surface has no per-path breakdown. It returns only one aggregate row from `storage_quotas`.

### Evidence 6: the current storage schema does not persist surface identity as queryable columns

Live database columns:

```sql
public.storage_upload_reservations
- reservation_id
- owner_user_id
- project_id
- bucket
- object_key
- requested_bytes
- content_type
- original_filename
- storage_kind
- source_uid
- status
- expires_at
- created_at
- completed_at
- doc_title
- source_type

public.storage_objects
- storage_object_id
- owner_user_id
- project_id
- bucket
- object_key
- byte_size
- content_type
- storage_kind
- source_uid
- checksum_sha256
- status
- reservation_id
- created_at
```

There is no `storage_surface` column and no `storage_service_slug` column in either table today.

That means the backend currently knows the surface only when constructing `object_key`. After that, the distinction survives only as a path prefix embedded inside text.

### Evidence 7: the live quota row has drifted from the authoritative storage rows

Live database state already verified during debugging:

```sql
storage_quotas
- quota_bytes = 53687091200
- used_bytes = 4098089
- reserved_bytes = 4098089

actual storage rows
- active storage_objects sum(byte_size) = 4098089
- pending storage_upload_reservations sum(requested_bytes) = 0
- completed storage_upload_reservations sum(requested_bytes) = 4098089
```

So the current aggregate quota row is wrong for remaining-space calculation. This plan must fix both:

- per-path attribution
- authoritative remaining-space calculation

## Scope

### Platform API

**Modified endpoints:** `3`

- `GET /storage/quota`
- `POST /storage/uploads`
- `POST /storage/uploads/{reservation_id}/complete`

`GET /storage/quota` returns:

- aggregate `quota_bytes`, `used_bytes`, `reserved_bytes`, `remaining_bytes`
- per-surface totals for `assets` and `pipeline-services`
- per-service breakdown inside `pipeline-services`

`POST /storage/uploads` keeps the existing request shape but persists `storage_surface` and `storage_service_slug` into the canonical reservation RPC.

`POST /storage/uploads/{reservation_id}/complete` keeps the existing completion path but copies the persisted surface metadata into `storage_objects`.

### Observability

This implementation adds zero new storage route names and zero new metric names. Existing storage spans remain authoritative, but the feature requires the storage observability seam to become explicit and surface-aware because the accounting change introduces first-class attribution across `assets` and `pipeline-services`.

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `storage.quota.read` | `services/platform-api/app/api/routes/storage.py:read_storage_quota` | Measure authoritative quota-read latency and expose whether the reconciled response included cross-surface breakdown data |
| Trace span | `storage.upload.reserve` | `services/platform-api/app/api/routes/storage.py:create_upload` | Measure reservation latency and failures for both upload surfaces |
| Trace span | `storage.upload.sign_url` | `services/platform-api/app/api/routes/storage.py:create_upload` | Measure signed URL generation inside the reservation flow |
| Trace span | `storage.upload.complete` | `services/platform-api/app/api/routes/storage.py:finalize_upload` | Measure completion latency and failures while carrying persisted surface metadata through finalization |
| Trace span | `storage.upload.cancel` | `services/platform-api/app/api/routes/storage.py:cancel_upload` | Preserve cancellation trace coverage for the existing storage lifecycle |
| Trace span | `storage.object.delete` | `services/platform-api/app/api/routes/storage.py:delete_storage_object` | Preserve deletion trace coverage for the existing storage lifecycle |
| Metric | `platform.storage.quota.read.count` | `services/platform-api/app/observability/storage_metrics.py:record_storage_quota_read` | Count quota reads against the reconciled surface-breakdown contract |
| Metric | `platform.storage.upload.reserve.count` | `services/platform-api/app/observability/storage_metrics.py:record_storage_upload_reserve` | Count successful reservation attempts by storage surface |
| Metric | `platform.storage.upload.reserve.failure.count` | `services/platform-api/app/observability/storage_metrics.py:record_storage_upload_reserve` | Count failed reservation attempts by storage surface |
| Metric | `platform.storage.upload.complete.count` | `services/platform-api/app/observability/storage_metrics.py:record_storage_upload_complete` | Count successful completions for persisted upload surfaces |
| Metric | `platform.storage.upload.complete.failure.count` | `services/platform-api/app/observability/storage_metrics.py:record_storage_upload_complete` | Count failed completions for persisted upload surfaces |
| Metric | `platform.storage.upload.cancel.count` | `services/platform-api/app/observability/storage_metrics.py:record_storage_upload_cancel` | Preserve cancellation counts for the existing storage lifecycle |
| Metric | `platform.storage.object.delete.count` | `services/platform-api/app/observability/storage_metrics.py:record_storage_object_delete` | Preserve deletion counts for the existing storage lifecycle |
| Metric | `platform.storage.quota.exceeded.count` | `services/platform-api/app/observability/storage_metrics.py:record_storage_upload_reserve` | Count over-quota rejections inside the shared quota pool |
| Histogram | `platform.storage.upload.reserve.duration.ms` | `services/platform-api/app/observability/storage_metrics.py:record_storage_upload_reserve` | Measure reservation duration by storage surface |
| Histogram | `platform.storage.upload.complete.duration.ms` | `services/platform-api/app/observability/storage_metrics.py:record_storage_upload_complete` | Measure completion duration by persisted upload surface |

Observability attribute rules:

- Allowed on trace spans and metrics: `storage.kind`, `storage.surface`, `requested.bytes`, `actual.bytes`, `quota.bytes`, `used.bytes`, `reserved.bytes`, `remaining.bytes`, `surface_count`, `pipeline.service_count`, `result`, `http.status_code`, `has_project_id`
- Allowed on trace spans only: `storage.service_slug`
- Forbidden in trace or metric attributes: `user_id`, `email`, `reservation_id`, `source_uid`, raw filenames, full storage object keys
- No new structured log contract is introduced in this plan; existing bridge-failure logging remains implementation detail, not a new product-owned log event

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260330153000_storage_surface_quota_breakdown.sql` | Adds `storage_surface` and `storage_service_slug` to `storage_upload_reservations` and `storage_objects`, replaces `reserve_user_storage`, replaces `complete_user_storage_upload`, and adds `read_user_storage_quota_breakdown` | Yes - backfills both tables from existing `object_key` prefixes and replaces the canonical storage RPC signatures without rewriting historical `storage_quotas` rows |

### Edge Functions

Zero edge function changes.

### Frontend Surface Area

**New pages:** `0`

**Modified pages:** `1`

- `web/src/pages/ProjectAssetsPage.tsx` keeps the existing quota-summary mount point and renders the expanded quota contract

**New components:** `0`

**Modified components:** `1`

- `web/src/components/storage/StorageQuotaSummary.tsx` renders aggregate totals plus `assets` and `pipeline-services` breakdown rows

**New hooks:** `0`

**Modified hooks:** `1`

- `web/src/hooks/useStorageQuota.ts` accepts the expanded `surface_breakdown` response shape

**New services:** `0`

**Modified services:** `0`

Update the Assets quota summary to show:

- aggregate total
- aggregate remaining
- `Assets` used / reserved
- `Pipeline Services` used / reserved
- service-level rows under Pipeline Services when nonzero

Keep the existing Assets page mount point unless a later, separate frontend layout plan supersedes it.

## Locked Acceptance Contract

1. The platform-api upload system continues to support both upload surfaces:
   - Assets
   - Pipeline Services
2. Both upload surfaces count against the same user quota pool.
3. `GET /storage/quota` returns the aggregate total and the per-surface breakdown in the same response.
4. Aggregate remaining storage is computed from authoritative active objects plus pending reservations, not from stale completed reservations.
5. Completed reservations do not continue inflating `reserved_bytes`.
6. The Assets UI shows storage consumed by:
   - Assets
   - Pipeline Services
7. The Assets UI shows remaining storage after summing usage across both paths.
8. Existing upload, signed URL, cancellation, completion, and source-document bridge behavior remains intact.

## Locked Platform API Surface

### Existing endpoints that remain

- `POST /storage/uploads`
- `POST /storage/uploads/{reservation_id}/complete`
- `DELETE /storage/uploads/{reservation_id}`
- `DELETE /storage/objects/{storage_object_id}`

### Modified endpoint

- `GET /storage/quota`

### Locked `GET /storage/quota` response

The modified route must preserve the existing top-level fields and add the new breakdown fields.

```json
{
  "quota_bytes": 53687091200,
  "used_bytes": 4098089,
  "reserved_bytes": 0,
  "remaining_bytes": 53682993111,
  "surface_breakdown": {
    "assets": {
      "used_bytes": 0,
      "reserved_bytes": 0,
      "total_bytes": 0
    },
    "pipeline_services": {
      "used_bytes": 4098089,
      "reserved_bytes": 0,
      "total_bytes": 4098089,
      "services": [
        {
          "service_slug": "index-builder",
          "used_bytes": 4098089,
          "reserved_bytes": 0,
          "total_bytes": 4098089
        }
      ]
    }
  }
}
```

### Locked `POST /storage/uploads` request shape

This request already accepts the relevant surface fields. The plan locks that behavior and persists it into the database.

```json
{
  "project_id": "uuid",
  "filename": "braintrust.md",
  "content_type": "application/octet-stream",
  "expected_bytes": 4098089,
  "storage_kind": "source",
  "source_uid": "sha256",
  "source_type": "md",
  "doc_title": "braintrust.md",
  "storage_surface": "pipeline-services",
  "storage_service_slug": "index-builder"
}
```

Assets uploads continue to omit the explicit surface and resolve to `assets`.

## Locked Observability Surface

This plan adds zero new storage route names and zero new metric names. It locks the existing storage observability names and requires surface-aware attribute coverage on the routes whose behavior changes in this plan.

#### Required traces: `6 retained names`

1. `storage.quota.read`
2. `storage.upload.reserve`
3. `storage.upload.sign_url`
4. `storage.upload.complete`
5. `storage.upload.cancel`
6. `storage.object.delete`

#### Required metrics: `8 counters`, `2 histograms`, `0 structured logs`

Counters:

1. `platform.storage.quota.read.count`
2. `platform.storage.upload.reserve.count`
3. `platform.storage.upload.reserve.failure.count`
4. `platform.storage.upload.complete.count`
5. `platform.storage.upload.complete.failure.count`
6. `platform.storage.upload.cancel.count`
7. `platform.storage.object.delete.count`
8. `platform.storage.quota.exceeded.count`

Histograms:

1. `platform.storage.upload.reserve.duration.ms`
2. `platform.storage.upload.complete.duration.ms`

#### Required attribute expansions

- `storage.quota.read` and `platform.storage.quota.read.count` must emit `remaining.bytes`, `surface_count`, and `pipeline.service_count` from the reconciled `GET /storage/quota` response.
- `storage.upload.reserve`, `storage.upload.sign_url`, and the reservation metrics must emit `storage.surface`; the trace spans may also emit `storage.service_slug` when the request targets `pipeline-services`.
- `storage.upload.complete` and the completion metrics must emit the persisted `storage.surface` resolved from the reservation before the object is finalized.
- `storage.upload.cancel` and `storage.object.delete` remain present with their current names; this plan does not add new attributes to those routes.

Allowed trace and metric attributes:

- `storage.kind`
- `storage.surface`
- `requested.bytes`
- `actual.bytes`
- `quota.bytes`
- `used.bytes`
- `reserved.bytes`
- `remaining.bytes`
- `surface_count`
- `pipeline.service_count`
- `result`
- `http.status_code`
- `has_project_id`

Allowed on trace spans only:

- `storage.service_slug`

Forbidden in observability payloads:

- `user_id`
- `email`
- `reservation_id`
- `source_uid`
- raw filenames
- full storage object keys

## Locked Inventory Counts And File Inventory

### Backend

- New database files: `1`
- Modified backend files: `2`
- Modified backend tests: `2`

### Frontend

- Modified frontend files: `3`
- New frontend tests: `1`
- Modified frontend tests: `1`

### Locked File Inventory

#### New database files

- `supabase/migrations/20260330153000_storage_surface_quota_breakdown.sql`

#### Modified backend files

- `services/platform-api/app/api/routes/storage.py`
- `services/platform-api/app/observability/storage_metrics.py`

#### Modified backend test files

- `services/platform-api/tests/test_storage_routes.py`
- `services/platform-api/tests/test_storage_helpers.py`

#### Modified frontend files

- `web/src/hooks/useStorageQuota.ts`
- `web/src/components/storage/StorageQuotaSummary.tsx`
- `web/src/pages/ProjectAssetsPage.tsx`

#### New frontend files

- `web/src/components/storage/StorageQuotaSummary.test.tsx`

#### Modified frontend test files

- `web/src/pages/ProjectAssetsPage.test.tsx`

## Frozen Seam Contract

- Assets uploads continue to call the existing storage reservation + signed URL + completion flow.
- Pipeline Services uploads continue to call the same storage reservation + signed URL + completion flow with `storage_surface: 'pipeline-services'`.
- `source_documents` upsert-on-completion remains in place.
- The top-level `quota_bytes`, `used_bytes`, and `reserved_bytes` keys remain present in `GET /storage/quota`.
- Existing callers that only read the top-level fields must not break.

## Explicit Risks Accepted In This Plan

1. Adding explicit surface columns changes canonical storage persistence, but leaving the distinction embedded only in `object_key` is insufficient for a reliable backend quota breakdown.
2. The live database already shows quota drift, so this plan intentionally treats the storage tables as authoritative and the aggregate quota row as a reconciled cache, not the other way around.
3. Replacing the canonical `reserve_user_storage` signature must be done carefully because duplicate overloads already exist in Postgres.
4. Service-level grouping for Pipeline Services depends on `storage_service_slug` backfill quality for existing rows; rows that cannot be parsed must be surfaced as `unknown`.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked platform API surface in this plan exists exactly as specified.
2. `storage_upload_reservations` and `storage_objects` persist `storage_surface` and `storage_service_slug`.
3. Existing storage rows are backfilled correctly from `object_key`.
4. `GET /storage/quota` returns aggregate totals plus `surface_breakdown`.
5. The returned aggregate totals match the sums of:
   - active `storage_objects`
   - pending `storage_upload_reservations`
6. Completed reservations no longer contribute to `reserved_bytes`.
7. The Assets quota UI shows both Assets and Pipeline Services usage and the combined remaining total.
8. The locked traces, metrics, and attribute rules for the storage surface exist exactly as specified.
9. Backend and frontend tests explicitly cover the per-surface breakdown contract and the storage observability helper inputs.
10. The inventory counts in this plan match the actual set of created and modified files.

## Task 1: Add first-class storage surface persistence and authoritative read RPC

**File(s):** `supabase/migrations/20260330153000_storage_surface_quota_breakdown.sql`

### Step 1: Add the new persistence columns

```sql
ALTER TABLE public.storage_upload_reservations
  ADD COLUMN IF NOT EXISTS storage_surface TEXT NOT NULL DEFAULT 'assets',
  ADD COLUMN IF NOT EXISTS storage_service_slug TEXT NULL;

ALTER TABLE public.storage_objects
  ADD COLUMN IF NOT EXISTS storage_surface TEXT NOT NULL DEFAULT 'assets',
  ADD COLUMN IF NOT EXISTS storage_service_slug TEXT NULL;

ALTER TABLE public.storage_upload_reservations
  DROP CONSTRAINT IF EXISTS storage_upload_reservations_storage_surface_check;

ALTER TABLE public.storage_upload_reservations
  ADD CONSTRAINT storage_upload_reservations_storage_surface_check
  CHECK (storage_surface IN ('assets', 'pipeline-services'));

ALTER TABLE public.storage_objects
  DROP CONSTRAINT IF EXISTS storage_objects_storage_surface_check;

ALTER TABLE public.storage_objects
  ADD CONSTRAINT storage_objects_storage_surface_check
  CHECK (storage_surface IN ('assets', 'pipeline-services'));

CREATE INDEX IF NOT EXISTS idx_storage_upload_reservations_owner_surface_status
  ON public.storage_upload_reservations (owner_user_id, storage_surface, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_storage_objects_owner_surface_status
  ON public.storage_objects (owner_user_id, storage_surface, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_storage_objects_owner_service_status
  ON public.storage_objects (owner_user_id, storage_service_slug, status, created_at DESC);
```

### Step 2: Backfill the new columns from `object_key`

```sql
UPDATE public.storage_upload_reservations
SET
  storage_surface = CASE
    WHEN object_key LIKE 'users/%/pipeline-services/%' THEN 'pipeline-services'
    ELSE 'assets'
  END,
  storage_service_slug = CASE
    WHEN object_key LIKE 'users/%/pipeline-services/%'
      THEN NULLIF(regexp_replace(object_key, '^users/[^/]+/pipeline-services/([^/]+)/projects/.*$', '\1'), object_key)
    ELSE NULL
  END
WHERE storage_surface IS NULL
   OR storage_service_slug IS NULL;

UPDATE public.storage_objects
SET
  storage_surface = CASE
    WHEN object_key LIKE 'users/%/pipeline-services/%' THEN 'pipeline-services'
    ELSE 'assets'
  END,
  storage_service_slug = CASE
    WHEN object_key LIKE 'users/%/pipeline-services/%'
      THEN NULLIF(regexp_replace(object_key, '^users/[^/]+/pipeline-services/([^/]+)/projects/.*$', '\1'), object_key)
    ELSE NULL
  END
WHERE storage_surface IS NULL
   OR storage_service_slug IS NULL;

UPDATE public.storage_upload_reservations
SET storage_service_slug = 'unknown'
WHERE storage_surface = 'pipeline-services'
  AND COALESCE(storage_service_slug, '') = '';

UPDATE public.storage_objects
SET storage_service_slug = 'unknown'
WHERE storage_surface = 'pipeline-services'
  AND COALESCE(storage_service_slug, '') = '';
```

### Step 3: Replace the canonical reservation RPC

```sql
DROP FUNCTION IF EXISTS public.reserve_user_storage(UUID, UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.reserve_user_storage(UUID, UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.reserve_user_storage(
  p_user_id UUID,
  p_project_id UUID,
  p_bucket TEXT,
  p_object_key TEXT,
  p_requested_bytes BIGINT,
  p_content_type TEXT,
  p_original_filename TEXT,
  p_storage_kind TEXT DEFAULT 'source',
  p_source_uid TEXT DEFAULT NULL,
  p_source_type TEXT DEFAULT NULL,
  p_doc_title TEXT DEFAULT NULL,
  p_storage_surface TEXT DEFAULT 'assets',
  p_storage_service_slug TEXT DEFAULT NULL
)
RETURNS public.storage_upload_reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_quota public.storage_quotas;
  v_reservation public.storage_upload_reservations;
BEGIN
  IF p_requested_bytes < 0 THEN
    RAISE EXCEPTION 'requested bytes must be non-negative';
  END IF;

  IF p_project_id IS NOT NULL AND NOT public._storage_user_owns_project(p_user_id, p_project_id) THEN
    RAISE EXCEPTION 'project does not belong to user';
  END IF;

  IF p_storage_kind NOT IN ('source', 'converted', 'parsed', 'export') THEN
    RAISE EXCEPTION 'invalid storage kind';
  END IF;

  IF p_storage_surface NOT IN ('assets', 'pipeline-services') THEN
    RAISE EXCEPTION 'invalid storage surface';
  END IF;

  IF p_storage_surface = 'pipeline-services' AND COALESCE(BTRIM(p_storage_service_slug), '') = '' THEN
    RAISE EXCEPTION 'pipeline-services uploads require storage_service_slug';
  END IF;

  SELECT *
  INTO v_quota
  FROM public.storage_quotas
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'quota not provisioned for user';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.storage_upload_reservations r
    WHERE r.owner_user_id = p_user_id
      AND r.object_key = p_object_key
      AND r.bucket = p_bucket
      AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'pending reservation already exists for this object';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.storage_objects so
    WHERE so.owner_user_id = p_user_id
      AND so.bucket = p_bucket
      AND so.object_key = p_object_key
      AND so.status = 'active'
  ) THEN
    RAISE EXCEPTION 'object already exists';
  END IF;

  IF v_quota.used_bytes + v_quota.reserved_bytes + p_requested_bytes > v_quota.quota_bytes THEN
    RAISE EXCEPTION 'storage quota exceeded';
  END IF;

  UPDATE public.storage_quotas
  SET reserved_bytes = reserved_bytes + p_requested_bytes,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.storage_upload_reservations (
    owner_user_id,
    project_id,
    bucket,
    object_key,
    requested_bytes,
    content_type,
    original_filename,
    storage_kind,
    source_uid,
    source_type,
    doc_title,
    storage_surface,
    storage_service_slug
  )
  VALUES (
    p_user_id,
    p_project_id,
    p_bucket,
    p_object_key,
    p_requested_bytes,
    p_content_type,
    p_original_filename,
    p_storage_kind,
    p_source_uid,
    p_source_type,
    p_doc_title,
    p_storage_surface,
    CASE
      WHEN p_storage_surface = 'pipeline-services' THEN p_storage_service_slug
      ELSE NULL
    END
  )
  RETURNING *
  INTO v_reservation;

  RETURN v_reservation;
END;
$$;
```

### Step 4: Persist the same surface metadata on completion

```sql
CREATE OR REPLACE FUNCTION public.complete_user_storage_upload(
  p_reservation_id UUID,
  p_owner_user_id UUID,
  p_actual_bytes BIGINT DEFAULT NULL,
  p_checksum_sha256 TEXT DEFAULT NULL
)
RETURNS public.storage_objects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reservation public.storage_upload_reservations;
  v_finalized_bytes BIGINT;
  v_object public.storage_objects;
BEGIN
  SELECT *
  INTO v_reservation
  FROM public.storage_upload_reservations
  WHERE reservation_id = p_reservation_id
    AND owner_user_id = p_owner_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reservation not found';
  END IF;

  IF v_reservation.status = 'completed' THEN
    SELECT *
    INTO v_object
    FROM public.storage_objects
    WHERE reservation_id = p_reservation_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'object row missing';
    END IF;

    RETURN v_object;
  END IF;

  IF v_reservation.status <> 'pending' THEN
    RAISE EXCEPTION 'reservation already % - cannot complete', v_reservation.status;
  END IF;

  IF v_reservation.expires_at <= now() THEN
    RAISE EXCEPTION 'reservation expired';
  END IF;

  v_finalized_bytes := COALESCE(p_actual_bytes, v_reservation.requested_bytes);

  IF v_finalized_bytes < 0 THEN
    RAISE EXCEPTION 'actual bytes must be non-negative';
  END IF;

  IF v_finalized_bytes > v_reservation.requested_bytes THEN
    RAISE EXCEPTION 'actual bytes cannot exceed reserved bytes';
  END IF;

  INSERT INTO public.storage_objects (
    reservation_id,
    owner_user_id,
    project_id,
    bucket,
    object_key,
    byte_size,
    content_type,
    storage_kind,
    source_uid,
    checksum_sha256,
    status,
    storage_surface,
    storage_service_slug
  )
  VALUES (
    v_reservation.reservation_id,
    v_reservation.owner_user_id,
    v_reservation.project_id,
    v_reservation.bucket,
    v_reservation.object_key,
    v_finalized_bytes,
    v_reservation.content_type,
    v_reservation.storage_kind,
    v_reservation.source_uid,
    p_checksum_sha256,
    'active',
    v_reservation.storage_surface,
    v_reservation.storage_service_slug
  )
  ON CONFLICT (reservation_id) DO UPDATE
    SET byte_size = EXCLUDED.byte_size,
        checksum_sha256 = EXCLUDED.checksum_sha256,
        status = EXCLUDED.status,
        content_type = EXCLUDED.content_type,
        source_uid = EXCLUDED.source_uid,
        storage_surface = EXCLUDED.storage_surface,
        storage_service_slug = EXCLUDED.storage_service_slug
  RETURNING * INTO v_object;

  UPDATE public.storage_quotas
  SET reserved_bytes = reserved_bytes - v_reservation.requested_bytes,
      used_bytes = used_bytes + v_finalized_bytes,
      updated_at = now()
  WHERE user_id = p_owner_user_id
    AND reserved_bytes >= v_reservation.requested_bytes;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reserved bytes underflow';
  END IF;

  UPDATE public.storage_upload_reservations
  SET status = 'completed',
      completed_at = now()
  WHERE reservation_id = p_reservation_id;

  RETURN v_object;
END;
$$;
```

### Step 5: Add an authoritative read RPC that reconciles and returns the breakdown

```sql
CREATE OR REPLACE FUNCTION public.read_user_storage_quota_breakdown(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_quota public.storage_quotas;
  v_assets_used BIGINT := 0;
  v_assets_reserved BIGINT := 0;
  v_pipeline_used BIGINT := 0;
  v_pipeline_reserved BIGINT := 0;
  v_pipeline_services JSONB := '[]'::jsonb;
BEGIN
  SELECT *
  INTO v_quota
  FROM public.reconcile_user_storage_usage(p_user_id);

  SELECT
    COALESCE(SUM(CASE WHEN storage_surface = 'assets' THEN byte_size ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN storage_surface = 'pipeline-services' THEN byte_size ELSE 0 END), 0)
  INTO
    v_assets_used,
    v_pipeline_used
  FROM public.storage_objects
  WHERE owner_user_id = p_user_id
    AND status = 'active';

  SELECT
    COALESCE(SUM(CASE WHEN storage_surface = 'assets' THEN requested_bytes ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN storage_surface = 'pipeline-services' THEN requested_bytes ELSE 0 END), 0)
  INTO
    v_assets_reserved,
    v_pipeline_reserved
  FROM public.storage_upload_reservations
  WHERE owner_user_id = p_user_id
    AND status = 'pending';

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'service_slug', service_slug,
        'used_bytes', used_bytes,
        'reserved_bytes', reserved_bytes,
        'total_bytes', used_bytes + reserved_bytes
      )
      ORDER BY service_slug
    ),
    '[]'::jsonb
  )
  INTO v_pipeline_services
  FROM (
    WITH service_used AS (
      SELECT
        COALESCE(storage_service_slug, 'unknown') AS service_slug,
        SUM(byte_size)::BIGINT AS used_bytes
      FROM public.storage_objects
      WHERE owner_user_id = p_user_id
        AND status = 'active'
        AND storage_surface = 'pipeline-services'
      GROUP BY COALESCE(storage_service_slug, 'unknown')
    ),
    service_reserved AS (
      SELECT
        COALESCE(storage_service_slug, 'unknown') AS service_slug,
        SUM(requested_bytes)::BIGINT AS reserved_bytes
      FROM public.storage_upload_reservations
      WHERE owner_user_id = p_user_id
        AND status = 'pending'
        AND storage_surface = 'pipeline-services'
      GROUP BY COALESCE(storage_service_slug, 'unknown')
    ),
    merged AS (
      SELECT
        COALESCE(u.service_slug, r.service_slug) AS service_slug,
        COALESCE(u.used_bytes, 0) AS used_bytes,
        COALESCE(r.reserved_bytes, 0) AS reserved_bytes
      FROM service_used u
      FULL OUTER JOIN service_reserved r
        ON r.service_slug = u.service_slug
    )
    SELECT * FROM merged
  ) grouped;

  RETURN jsonb_build_object(
    'quota_bytes', v_quota.quota_bytes,
    'used_bytes', v_quota.used_bytes,
    'reserved_bytes', v_quota.reserved_bytes,
    'remaining_bytes', GREATEST(v_quota.quota_bytes - v_quota.used_bytes - v_quota.reserved_bytes, 0),
    'surface_breakdown', jsonb_build_object(
      'assets', jsonb_build_object(
        'used_bytes', v_assets_used,
        'reserved_bytes', v_assets_reserved,
        'total_bytes', v_assets_used + v_assets_reserved
      ),
      'pipeline_services', jsonb_build_object(
        'used_bytes', v_pipeline_used,
        'reserved_bytes', v_pipeline_reserved,
        'total_bytes', v_pipeline_used + v_pipeline_reserved,
        'services', v_pipeline_services
      )
    )
  );
END;
$$;
```

## Task 2: Change platform-api to persist and return the full breakdown contract

**File(s):** `services/platform-api/app/api/routes/storage.py`

### Step 1: tighten request validation for upload surfaces

Replace the request model block with:

```py
class CreateUploadRequest(BaseModel):
    project_id: str = Field(min_length=1)
    filename: str = Field(min_length=1)
    content_type: str = Field(min_length=1)
    expected_bytes: int = Field(ge=0)
    storage_kind: StorageKind = "source"
    source_uid: str | None = None
    source_type: str | None = None
    doc_title: str | None = None
    upload_id: str | None = None
    artifact_name: str | None = None
    storage_surface: StorageSurface | None = None
    storage_service_slug: str | None = None

    @model_validator(mode="after")
    def validate_surface_contract(self):
        surface = self.storage_surface or "assets"
        if surface == "pipeline-services" and not (self.storage_service_slug or "").strip():
            raise ValueError("storage_service_slug is required for pipeline-services uploads")
        if surface == "assets":
            self.storage_service_slug = None
        return self
```

### Step 2: send the new surface fields into the canonical reservation RPC

Replace the reservation RPC payload with:

```py
reservation, created_new_reservation = _reserve_upload_with_duplicate_recovery(
    admin,
    user_id=auth.user_id,
    project_id=body.project_id,
    bucket=settings.gcs_user_storage_bucket,
    object_key=object_key,
    requested_bytes=body.expected_bytes,
    content_type=body.content_type,
    original_filename=body.filename,
    storage_kind=body.storage_kind,
    source_uid=body.source_uid,
    source_type=body.source_type,
    doc_title=body.doc_title,
    storage_surface=body.storage_surface,
    storage_service_slug=body.storage_service_slug,
)
```

Update `_reserve_upload_with_duplicate_recovery()` so the RPC payload includes:

```py
payload = {
    "p_user_id": user_id,
    "p_project_id": project_id,
    "p_bucket": bucket,
    "p_object_key": object_key,
    "p_requested_bytes": requested_bytes,
    "p_content_type": content_type,
    "p_original_filename": original_filename,
    "p_storage_kind": storage_kind,
    "p_source_uid": source_uid,
    "p_source_type": source_type,
    "p_doc_title": doc_title,
    "p_storage_surface": storage_surface or "assets",
    "p_storage_service_slug": storage_service_slug,
}
```

### Step 3: replace the aggregate-only quota read with the authoritative RPC

Replace the route body with:

```py
@router.get("/quota")
async def read_storage_quota(auth=Depends(require_user_auth)):
    started = perf_counter()
    with storage_tracer.start_as_current_span("storage.quota.read"):
        admin = get_supabase_admin()
        try:
            result = admin.rpc(
                "read_user_storage_quota_breakdown",
                {"p_user_id": auth.user_id},
            ).execute()
            payload = result.data
            record_storage_quota_read(
                result="ok",
                quota_bytes=payload.get("quota_bytes"),
                used_bytes=payload.get("used_bytes"),
                reserved_bytes=payload.get("reserved_bytes"),
                remaining_bytes=payload.get("remaining_bytes"),
                surface_count=len(payload.get("surface_breakdown", {})),
                pipeline_service_count=len(
                    payload.get("surface_breakdown", {})
                    .get("pipeline_services", {})
                    .get("services", [])
                ),
                http_status_code=200,
            )
            return payload
        except Exception as exc:
            http_exc = _http_from_supabase_error(exc)
            record_storage_quota_read(
                result="error",
                quota_bytes=None,
                used_bytes=None,
                reserved_bytes=None,
                remaining_bytes=None,
                surface_count=None,
                pipeline_service_count=None,
                http_status_code=http_exc.status_code,
            )
            raise http_exc from exc
```

## Task 3: Lock surface-aware storage observability and backend regression coverage

**File(s):** `services/platform-api/app/observability/storage_metrics.py`, `services/platform-api/app/api/routes/storage.py`, `services/platform-api/tests/test_storage_routes.py`, `services/platform-api/tests/test_storage_helpers.py`

This plan does not introduce new storage route names or new metric names. It extends the existing storage observability helper and route spans so the accounting change is visible at the same depth as the API and database change.

### Step 1: extend the storage helper inputs for the modified storage surfaces

Update [`storage_metrics.py`](/e:/writing-system/services/platform-api/app/observability/storage_metrics.py) so the existing helper functions accept the attributes needed by this plan:

- `record_storage_quota_read(...)` adds `remaining_bytes`, `surface_count`, and `pipeline_service_count`
- `record_storage_upload_reserve(...)` adds `storage_surface`
- `record_storage_upload_complete(...)` adds `storage_surface`

Do not add `storage_service_slug` as a metric attribute. That value is allowed on trace spans only.

### Step 2: add the required trace attributes inside the modified route flow

Update [`storage.py`](/e:/writing-system/services/platform-api/app/api/routes/storage.py) so the existing spans carry the accounting dimensions introduced by this plan:

```python
with storage_tracer.start_as_current_span("storage.upload.reserve") as span:
    span.set_attribute("storage.kind", body.storage_kind)
    span.set_attribute("storage.surface", body.storage_surface or "assets")
    if body.storage_service_slug:
        span.set_attribute("storage.service_slug", body.storage_service_slug)
```

For `GET /storage/quota`, set `remaining.bytes`, `surface_count`, and `pipeline.service_count` on `storage.quota.read` from the reconciled response before returning it.

For `storage.upload.complete`, resolve `storage_surface` from the reservation row and emit that value on the span and the completion helper call before the upload is finalized.

### Step 3: keep non-surface routes retained, not expanded

`storage.upload.cancel` and `storage.object.delete` stay in the locked observability surface with their current names, but this plan does not add new accounting attributes to those routes. Do not introduce extra queries only to enrich cancel/delete telemetry.

### Step 4: add or update backend tests so the observability contract is explicit

#### Test 1: Assets upload path defaults to `assets`

```py
assert rpc_calls == [
    (
        "reserve_user_storage",
        {
            "p_user_id": "user-1",
            "p_project_id": "project-1",
            "p_bucket": "unit-bucket",
            "p_object_key": "users/user-1/assets/projects/project-1/sources/src-1/source/a.txt",
            "p_requested_bytes": 1,
            "p_content_type": "text/plain",
            "p_original_filename": "a.txt",
            "p_storage_kind": "source",
            "p_source_uid": "src-1",
            "p_source_type": "txt",
            "p_doc_title": "folder/a.txt",
            "p_storage_surface": "assets",
            "p_storage_service_slug": None,
        },
    )
]
```

Also assert that the reservation observability helper received `storage_surface="assets"`.

#### Test 2: Pipeline Services upload path persists pipeline surface + service slug

```py
assert rpc_calls == [
    (
        "reserve_user_storage",
        {
            "p_user_id": "user-1",
            "p_project_id": "project-1",
            "p_bucket": "unit-bucket",
            "p_object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-1/source/notes.md",
            "p_requested_bytes": 12,
            "p_content_type": "text/markdown",
            "p_original_filename": "notes.md",
            "p_storage_kind": "source",
            "p_source_uid": "src-1",
            "p_source_type": "md",
            "p_doc_title": "notes.md",
            "p_storage_surface": "pipeline-services",
            "p_storage_service_slug": "index-builder",
        },
    )
]
```

Also assert that the reservation observability helper received `storage_surface="pipeline-services"` and that the `storage.upload.reserve` trace path may set `storage.service_slug`, but the metric helper payload does not include it.

#### Test 3: quota read returns the reconciled breakdown payload

```py
payload = {
    "quota_bytes": 1000,
    "used_bytes": 300,
    "reserved_bytes": 50,
    "remaining_bytes": 650,
    "surface_breakdown": {
        "assets": {"used_bytes": 100, "reserved_bytes": 0, "total_bytes": 100},
        "pipeline_services": {
            "used_bytes": 200,
            "reserved_bytes": 50,
            "total_bytes": 250,
            "services": [
                {"service_slug": "index-builder", "used_bytes": 200, "reserved_bytes": 50, "total_bytes": 250}
            ],
        },
    },
}
```

Assert that `GET /storage/quota` returns this payload unchanged from the RPC response and that `record_storage_quota_read(...)` receives:

```py
{
    "remaining_bytes": 650,
    "surface_count": 2,
    "pipeline_service_count": 1,
}
```

#### Test 4: storage helper tests reject forbidden metric attributes

Update [`test_storage_helpers.py`](/e:/writing-system/services/platform-api/tests/test_storage_helpers.py) so the helper-level assertions cover the new allowed attributes and explicitly prove that metric helper payloads do not emit `storage.service_slug`, `reservation_id`, filenames, or object keys.

## Task 4: Extend the frontend quota contract to render both paths and the combined remaining amount

**File(s):** `web/src/hooks/useStorageQuota.ts`, `web/src/components/storage/StorageQuotaSummary.tsx`, `web/src/pages/ProjectAssetsPage.tsx`

### Step 1: update the quota hook type

Replace the current type with:

```ts
export type StorageQuota = {
  quota_bytes: number;
  used_bytes: number;
  reserved_bytes: number;
  remaining_bytes: number;
  surface_breakdown: {
    assets: {
      used_bytes: number;
      reserved_bytes: number;
      total_bytes: number;
    };
    pipeline_services: {
      used_bytes: number;
      reserved_bytes: number;
      total_bytes: number;
      services: Array<{
        service_slug: string;
        used_bytes: number;
        reserved_bytes: number;
        total_bytes: number;
      }>;
    };
  };
};
```

The fetch path stays the same:

```ts
const response = await platformApiFetch('/storage/quota');
```

### Step 2: render the per-path breakdown and remaining total

Replace the summary body in [`StorageQuotaSummary.tsx`](/e:/writing-system/web/src/components/storage/StorageQuotaSummary.tsx) with:

```tsx
export function StorageQuotaSummary({
  quota,
  loading,
  error,
}: {
  quota: StorageQuota | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return <div className="px-3 py-2 text-sm text-muted-foreground">Loading storage...</div>;
  }

  if (error || !quota) {
    return <div className="px-3 py-2 text-sm text-destructive">{error ?? 'Storage unavailable'}</div>;
  }

  const assets = quota.surface_breakdown.assets;
  const pipeline = quota.surface_breakdown.pipeline_services;

  return (
    <div className="grid gap-1 rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="text-sm font-medium text-foreground">
        {formatStorageBytes(quota.quota_bytes)} total
      </div>
      <div className="text-xs text-muted-foreground">
        {formatStorageBytes(quota.remaining_bytes)} remaining
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Assets: {formatStorageBytes(assets.used_bytes)} used, {formatStorageBytes(assets.reserved_bytes)} reserved
      </div>
      <div className="text-xs text-muted-foreground">
        Pipeline Services: {formatStorageBytes(pipeline.used_bytes)} used, {formatStorageBytes(pipeline.reserved_bytes)} reserved
      </div>
      {pipeline.services.length > 0 && (
        <div className="mt-1 grid gap-1">
          {pipeline.services.map((service) => (
            <div key={service.service_slug} className="text-[11px] text-muted-foreground">
              {service.service_slug}: {formatStorageBytes(service.used_bytes)} used, {formatStorageBytes(service.reserved_bytes)} reserved
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 3: keep the page mount stable

This plan does not change the quota summary mount point. [`ProjectAssetsPage.tsx`](/e:/writing-system/web/src/pages/ProjectAssetsPage.tsx) continues to render:

```tsx
<StorageQuotaSummary quota={quota.data} loading={quota.loading} error={quota.error} />
```

The functional change is the returned data contract and what the component renders.

## Task 5: Lock the frontend behavior in tests

**File(s):** `web/src/components/storage/StorageQuotaSummary.test.tsx`, `web/src/pages/ProjectAssetsPage.test.tsx`

### New component test

```tsx
it('renders assets and pipeline services usage plus remaining storage', () => {
  render(
    <StorageQuotaSummary
      loading={false}
      error={null}
      quota={{
        quota_bytes: 1000,
        used_bytes: 300,
        reserved_bytes: 50,
        remaining_bytes: 650,
        surface_breakdown: {
          assets: { used_bytes: 100, reserved_bytes: 0, total_bytes: 100 },
          pipeline_services: {
            used_bytes: 200,
            reserved_bytes: 50,
            total_bytes: 250,
            services: [
              { service_slug: 'index-builder', used_bytes: 200, reserved_bytes: 50, total_bytes: 250 },
            ],
          },
        },
      }}
    />
  );

  expect(screen.getByText(/remaining/i)).toBeInTheDocument();
  expect(screen.getByText(/Assets:/i)).toBeInTheDocument();
  expect(screen.getByText(/Pipeline Services:/i)).toBeInTheDocument();
  expect(screen.getByText(/index-builder:/i)).toBeInTheDocument();
});
```

### Updated page test

Change the mocked `GET /storage/quota` payload in [`ProjectAssetsPage.test.tsx`](/e:/writing-system/web/src/pages/ProjectAssetsPage.test.tsx) to the expanded contract and assert:

```tsx
expect(await screen.findByText(/remaining/i)).toBeInTheDocument();
expect(screen.getByText(/Assets:/i)).toBeInTheDocument();
expect(screen.getByText(/Pipeline Services:/i)).toBeInTheDocument();
```

## Task 6: Run verification

**Backend verification:**

```bash
cd services/platform-api && pytest -q tests/test_storage_routes.py tests/test_storage_helpers.py
```

**Frontend verification:**

```bash
cd web && npm run test -- src/components/storage/StorageQuotaSummary.test.tsx src/pages/ProjectAssetsPage.test.tsx
```

**Expected output:** backend tests prove both upload surfaces feed the same storage control plane with explicit surface persistence, surface-aware observability, and an authoritative quota breakdown, while frontend tests prove the Assets page renders both path totals and the combined remaining quota.
