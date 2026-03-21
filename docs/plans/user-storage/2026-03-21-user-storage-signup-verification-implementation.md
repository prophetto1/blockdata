# User Storage Signup Verification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the full signup-verification storage feature: policy-backed default quota for new users, quota-aware uploads and quota display in the authenticated product, and a superuser storage policy plus provisioning monitor so a new signup can be verified end-to-end.

**Architecture:** Keep `services/platform-api` as the runtime storage control plane and extend it with superuser-only storage administration endpoints. Move new-user quota assignment from the hard-coded `50 GB` literal in SQL to `admin_runtime_policy`, preserve the current `Default Project` provisioning flow, migrate browser uploads away from the legacy Supabase `ingest` edge path to `/storage/uploads`, and have storage completion write through to `source_documents` so the current assets/parsing UI continues to function.

**Tech Stack:** Supabase Postgres migrations and RPCs, FastAPI, React + TypeScript, OpenTelemetry, pytest, Vitest.

---

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. There is one global superuser storage administration surface, not a per-user admin UI.
2. The superuser surface lives inside the existing [`SuperuserWorkspace.tsx`](/e:/writing-system/web/src/pages/superuser/SuperuserWorkspace.tsx), not a new top-level route.
3. Global default quota changes affect future users only in this phase. Bulk-repricing or bulk backfill of existing users is out of scope for this implementation.
4. The authenticated product must show user storage status on the live assets route, which is [`ProjectAssetsPage.tsx`](/e:/writing-system/web/src/pages/ProjectAssetsPage.tsx) plus [`useAssetsWorkbench.tsx`](/e:/writing-system/web/src/pages/useAssetsWorkbench.tsx), not the unmounted [`AssetsPanel.tsx`](/e:/writing-system/web/src/components/documents/AssetsPanel.tsx).
5. The backend storage control plane remains the existing user-scoped routes in [`storage.py`](/e:/writing-system/services/platform-api/app/api/routes/storage.py). We do not create a second upload API.
6. The current app still reads user-visible asset state from `source_documents` via [`useProjectDocuments.ts`](/e:/writing-system/web/src/hooks/useProjectDocuments.ts). For this phase, `source_documents` remains the compatibility list spine.
7. The backend, not the frontend, owns the compatibility bridge from `storage_objects` to `source_documents` when `storage_kind = 'source'`.
8. `source_uid` remains content-addressed and must stay compatible with the current ingest flow in [`supabase/functions/ingest/index.ts`](/e:/writing-system/supabase/functions/ingest/index.ts): SHA-256 of `${source_type}\n` plus file bytes.
9. Quota is an entitlement row in Postgres, not preallocated GCS space.
10. Cloud-import flows and non-browser ingest sources are out of scope unless they already go through the storage control plane.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. A superuser can set the default new-user quota to `5 GB`.
2. A brand-new user signs up with a new email.
3. Signup yields all three records:
   - `auth.users`
   - `Default Project`
   - `storage_quotas`
4. After login, the new user lands in the auth-gated app and `Default Project` is focused automatically.
5. On the Assets page, the user sees `0 used / 5 GB total / 5 GB remaining`.
6. The user uploads a `1 GB` file through the migrated storage upload path.
7. The uploaded file appears in the assets experience that currently depends on `source_documents`.
8. The user then sees `1 GB used / 4 GB remaining`.
9. The superuser provisioning monitor shows that signup completed with no missing records.

### Locked Platform API Surface

#### New superuser-only platform API endpoints: `3`

1. `GET /admin/storage/policy`
2. `PATCH /admin/storage/policy`
3. `GET /admin/storage/provisioning/recent`

#### Existing platform API endpoints reused as-is: `6`

1. `GET /storage/quota`
2. `POST /storage/uploads`
3. `POST /storage/uploads/{reservation_id}/complete`
4. `DELETE /storage/uploads/{reservation_id}`
5. `DELETE /storage/objects/{storage_object_id}`
6. `POST /storage/quota/reconcile`

#### Required user API contract extensions

`POST /storage/uploads` must accept additional source-upload metadata:

```json
{
  "project_id": "6f116c46-7a65-4a63-ae02-1c33f06d7d89",
  "filename": "outline.pdf",
  "content_type": "application/pdf",
  "expected_bytes": 1073741824,
  "storage_kind": "source",
  "source_type": "pdf",
  "doc_title": "outline.pdf",
  "source_uid": "f2f12ce0bbd8f5b6c5f9f07dc6fbc8b86a97a7ce86ed9f3c7a56b5a1c4e6df42"
}
```

Expected reservation response:

```json
{
  "reservation_id": "8bb95b55-3f41-47d6-bd4c-4d164f62d16f",
  "object_key": "users/1a.../projects/6f.../source/f2f12c.../outline.pdf",
  "signed_upload_url": "https://storage.googleapis.com/...",
  "expires_at": "2026-03-21T20:30:00Z",
  "quota_snapshot": {
    "quota_bytes": 5368709120,
    "used_bytes": 0,
    "reserved_bytes": 1073741824,
    "remaining_bytes": 4294967296
  }
}
```

`POST /storage/uploads/{reservation_id}/complete` must continue to finalize quota accounting and, when `storage_kind = 'source'`, also create or update a matching `source_documents` row so existing list/realtime flows still work.

#### Locked admin endpoint response contracts

`GET /admin/storage/policy`

```json
{
  "default_new_user_quota_bytes": 5368709120,
  "updated_at": "2026-03-21T18:25:00Z",
  "updated_by": "d7fd4f9a-4601-4a6b-ae96-62d9f24b4f2e"
}
```

`PATCH /admin/storage/policy`

```json
{
  "default_new_user_quota_bytes": 5368709120,
  "reason": "Set free-tier signup quota to 5 GB for verification"
}
```

`GET /admin/storage/provisioning/recent?limit=50`

```json
{
  "items": [
    {
      "user_id": "cc258c55-1780-41cf-a0d8-6e283c7c74a0",
      "email": "new-user@example.com",
      "created_at": "2026-03-21T18:20:00Z",
      "has_auth_user": true,
      "has_default_project": true,
      "default_project_id": "5ea0f0b8-0d90-4c24-a5ae-5dc3909d04bd",
      "has_storage_quota": true,
      "quota_bytes": 5368709120,
      "used_bytes": 0,
      "reserved_bytes": 0,
      "status": "ok"
    }
  ]
}
```

### Locked Observability Surface

#### New traces: `9`

1. `storage.quota.read`
2. `storage.upload.reserve`
3. `storage.upload.sign_url`
4. `storage.upload.complete`
5. `storage.upload.cancel`
6. `storage.object.delete`
7. `admin.storage.policy.read`
8. `admin.storage.policy.update`
9. `admin.storage.provisioning.recent`

#### New metrics: `10 counters`, `4 histograms`

Counters:

1. `platform.storage.quota.read.count`
2. `platform.storage.upload.reserve.count`
3. `platform.storage.upload.reserve.failure.count`
4. `platform.storage.upload.complete.count`
5. `platform.storage.upload.complete.failure.count`
6. `platform.storage.upload.cancel.count`
7. `platform.storage.object.delete.count`
8. `platform.storage.quota.exceeded.count`
9. `platform.admin.storage.policy.update.count`
10. `platform.admin.storage.provisioning.incomplete.count`

Histograms:

1. `platform.storage.upload.reserve.duration.ms`
2. `platform.storage.upload.complete.duration.ms`
3. `platform.admin.storage.policy.duration.ms`
4. `platform.admin.storage.provisioning.query.duration.ms`

Allowed trace and metric attributes:

- `storage.kind`
- `source.type`
- `requested.bytes`
- `actual.bytes`
- `quota.bytes`
- `used.bytes`
- `reserved.bytes`
- `limit`
- `status`
- `result`
- `http.status_code`
- `has_project_id`

Forbidden in observability payloads:

- `user_id`
- `email`
- `reservation_id`
- `source_uid`
- raw filenames
- full storage object keys

Structured logs required on policy update:

```python
logger.info(
    "admin.storage.policy.updated",
    extra={
        "actor_role": "platform_admin",
        "policy_key": "storage.default_new_user_quota_bytes",
        "old_value": 53687091200,
        "new_value": 5368709120,
        "reason": reason,
    },
)
```

### Locked Inventory Counts

#### Database

- New migrations: `2`
- Modified existing migrations: `0`

#### Backend

- New platform API route modules: `1`
- New backend helper modules: `2`
- Modified backend modules: `2`

#### Frontend

- New top-level pages/routes: `0`
- Modified existing pages: `2`
- New visual components: `3`
- Modified visual components: `3`
- New non-visual frontend modules: `2`
- Modified non-visual frontend modules: `2`

#### Tests

- New test modules: `4`
- Modified existing test modules: `4`

### Locked File Inventory

#### New files

- `supabase/migrations/20260321120000_storage_default_quota_policy.sql`
- `supabase/migrations/20260321130000_storage_source_document_bridge.sql`
- `services/platform-api/app/api/routes/admin_storage.py`
- `services/platform-api/app/observability/storage_metrics.py`
- `services/platform-api/app/services/storage_source_documents.py`
- `web/src/hooks/useStorageQuota.ts`
- `web/src/lib/storageUploadService.ts`
- `web/src/components/storage/StorageQuotaSummary.tsx`
- `web/src/pages/superuser/SuperuserStoragePolicy.tsx`
- `web/src/pages/superuser/SuperuserProvisioningMonitor.tsx`
- `services/platform-api/tests/test_admin_storage_routes.py`
- `web/src/lib/storageUploadService.test.ts`
- `web/src/pages/superuser/SuperuserWorkspaceStorage.test.tsx`

#### Modified files

- `services/platform-api/app/api/routes/storage.py`
- `services/platform-api/app/main.py`
- `web/src/pages/ProjectAssetsPage.tsx`
- `web/src/pages/useAssetsWorkbench.tsx`
- `web/src/hooks/useDirectUpload.ts`
- `web/src/components/documents/UploadTabPanel.tsx`
- `web/src/components/documents/ProjectParseUploader.tsx`
- `web/src/components/flows/FlowWorkbench.tsx`
- `web/src/pages/superuser/SuperuserWorkspace.tsx`
- `services/platform-api/tests/test_storage_routes.py`
- `services/platform-api/tests/test_storage_helpers.py`
- `web/src/pages/ProjectAssetsPage.test.tsx`
- `web/src/pages/project-assets-sync.test.tsx`

## Frozen Source Upload Contract

The current edge ingest flow computes `source_uid` before upload and the existing app depends on that identity model. The new storage upload path must preserve it instead of improvising a different ID scheme.

Frontend helper contract:

```ts
export async function computeSourceUid(file: File, sourceType: string): Promise<string> {
  const prefix = new TextEncoder().encode(`${sourceType}\n`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const joined = new Uint8Array(prefix.length + bytes.length);
  joined.set(prefix, 0);
  joined.set(bytes, prefix.length);
  const digest = await crypto.subtle.digest("SHA-256", joined);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
```

Backend completion bridge contract:

```python
async def upsert_source_document_for_storage_object(
    supabase_admin: Client,
    *,
    owner_id: str,
    project_id: str | None,
    source_uid: str,
    source_type: str,
    doc_title: str,
    storage_object_id: str,
    object_key: str,
    bytes_used: int,
) -> None:
    ...
```

---

## Implementation Tasks

### Task 1: Make the default new-user quota policy-backed

**Files:**
- Create: `supabase/migrations/20260321120000_storage_default_quota_policy.sql`
- Modify: `supabase/migrations/20260319190000_102_user_storage_quota.sql`

**Step 1: Add the migration that seeds the new policy key**

```sql
insert into public.admin_runtime_policy (policy_key, value_jsonb, value_type, description)
values (
  'storage.default_new_user_quota_bytes',
  '53687091200'::jsonb,
  'integer',
  'Default storage quota for newly created users'
)
on conflict (policy_key) do nothing;
```

**Step 2: Add a SQL helper that reads the policy with a safe fallback**

```sql
create or replace function public.current_default_user_storage_quota_bytes()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raw jsonb;
begin
  select value_jsonb
    into v_raw
    from public.admin_runtime_policy
   where policy_key = 'storage.default_new_user_quota_bytes';

  return greatest(
    coalesce(nullif(trim('"' from v_raw::text), '')::bigint, 53687091200),
    0
  );
end;
$$;
```

**Step 3: Replace the hard-coded signup literal in `handle_new_user_storage_quota()`**

```sql
create or replace function public.handle_new_user_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.storage_quotas (user_id, quota_bytes, used_bytes, reserved_bytes, plan_code)
  values (new.id, public.current_default_user_storage_quota_bytes(), 0, 0, 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
```

**Step 4: Reset the local database and verify the policy-backed default**

Run: `supabase db reset`

Then verify:

```sql
select public.current_default_user_storage_quota_bytes();
```

Expected: `53687091200`

**Step 5: Commit**

```bash
git add supabase/migrations/20260319190000_102_user_storage_quota.sql supabase/migrations/20260321120000_storage_default_quota_policy.sql
git commit -m "feat(storage): make signup quota policy-backed"
```

### Task 2: Add superuser storage admin routes in `platform-api`

**Files:**
- Create: `services/platform-api/app/api/routes/admin_storage.py`
- Modify: `services/platform-api/app/main.py`
- Test: `services/platform-api/tests/test_admin_storage_routes.py`

**Step 1: Write the failing route tests first**

```python
def test_get_storage_policy_requires_superuser(client):
    response = client.get("/admin/storage/policy")
    assert response.status_code in (401, 403)


def test_get_storage_policy_returns_current_value(superuser_client, monkeypatch):
    monkeypatch.setattr(
        "app.api.routes.admin_storage.load_default_new_user_quota_bytes",
        lambda *_args, **_kwargs: {
            "default_new_user_quota_bytes": 5368709120,
            "updated_at": "2026-03-21T18:25:00Z",
            "updated_by": "admin-id",
        },
    )
    response = superuser_client.get("/admin/storage/policy")
    assert response.status_code == 200
    assert response.json()["default_new_user_quota_bytes"] == 5368709120
```

**Step 2: Implement the new router**

```python
router = APIRouter(prefix="/admin/storage", tags=["admin-storage"])


@router.get("/policy")
async def get_storage_policy(
    auth=Depends(require_superuser),
    supabase_admin=Depends(get_supabase_admin),
):
    return await load_default_new_user_quota_bytes(supabase_admin)


@router.patch("/policy")
async def patch_storage_policy(
    payload: UpdateStoragePolicyRequest,
    auth=Depends(require_superuser),
    supabase_admin=Depends(get_supabase_admin),
):
    return await update_default_new_user_quota_bytes(
        supabase_admin,
        actor_id=auth.user_id,
        quota_bytes=payload.default_new_user_quota_bytes,
        reason=payload.reason,
    )
```

**Step 3: Add the recent provisioning endpoint**

```python
@router.get("/provisioning/recent")
async def get_recent_storage_provisioning(
    limit: int = Query(50, ge=1, le=200),
    auth=Depends(require_superuser),
    supabase_admin=Depends(get_supabase_admin),
):
    return await load_recent_signup_provisioning(supabase_admin, limit=limit)
```

**Step 4: Register the router in `main.py`**

```python
from app.api.routes.admin_storage import router as admin_storage_router

app.include_router(admin_storage_router)
```

**Step 5: Run tests and commit**

Run: `cd services/platform-api && pytest tests/test_admin_storage_routes.py -q`

Expected: PASS

```bash
git add services/platform-api/app/api/routes/admin_storage.py services/platform-api/app/main.py services/platform-api/tests/test_admin_storage_routes.py
git commit -m "feat(storage): add superuser storage admin routes"
```

### Task 3: Add explicit storage observability helpers and instrument the routes

**Files:**
- Create: `services/platform-api/app/observability/storage_metrics.py`
- Modify: `services/platform-api/app/api/routes/storage.py`
- Modify: `services/platform-api/app/api/routes/admin_storage.py`
- Modify: `services/platform-api/tests/test_storage_routes.py`

**Step 1: Add a shared metrics/tracing helper**

```python
from opentelemetry import metrics, trace

meter = metrics.get_meter("platform.storage")
tracer = trace.get_tracer("platform.storage")

quota_read_counter = meter.create_counter("platform.storage.quota.read.count")
upload_reserve_counter = meter.create_counter("platform.storage.upload.reserve.count")
upload_reserve_failure_counter = meter.create_counter("platform.storage.upload.reserve.failure.count")
upload_complete_counter = meter.create_counter("platform.storage.upload.complete.count")
upload_complete_failure_counter = meter.create_counter("platform.storage.upload.complete.failure.count")
policy_update_counter = meter.create_counter("platform.admin.storage.policy.update.count")

upload_reserve_duration = meter.create_histogram("platform.storage.upload.reserve.duration.ms")
upload_complete_duration = meter.create_histogram("platform.storage.upload.complete.duration.ms")
```

**Step 2: Instrument quota and upload routes with the locked span names**

```python
with tracer.start_as_current_span("storage.upload.reserve") as span:
    span.set_attribute("storage.kind", payload.storage_kind)
    span.set_attribute("requested.bytes", payload.expected_bytes)
    span.set_attribute("has_project_id", bool(payload.project_id))
    started = time.perf_counter()
    try:
        result = await reserve_upload(...)
        upload_reserve_counter.add(1, {"storage.kind": payload.storage_kind, "result": "ok"})
        return result
    except HTTPException:
        upload_reserve_failure_counter.add(1, {"storage.kind": payload.storage_kind, "result": "error"})
        raise
    finally:
        upload_reserve_duration.record((time.perf_counter() - started) * 1000.0, {"storage.kind": payload.storage_kind})
```

**Step 3: Instrument the admin storage routes**

```python
with tracer.start_as_current_span("admin.storage.policy.update"):
    policy_update_counter.add(1, {"result": "ok"})
    logger.info(
        "admin.storage.policy.updated",
        extra={
            "actor_role": "platform_admin",
            "policy_key": "storage.default_new_user_quota_bytes",
            "old_value": old_value,
            "new_value": quota_bytes,
            "reason": reason,
        },
    )
```

**Step 4: Add route tests that assert the helpers are invoked**

Use monkeypatch or test doubles to verify `record_*` helpers are called without snapshotting internal OTel objects.

**Step 5: Run tests and commit**

Run: `cd services/platform-api && pytest tests/test_storage_routes.py tests/test_admin_storage_routes.py -q`

Expected: PASS

```bash
git add services/platform-api/app/observability/storage_metrics.py services/platform-api/app/api/routes/storage.py services/platform-api/app/api/routes/admin_storage.py services/platform-api/tests/test_storage_routes.py
git commit -m "chore(storage): instrument storage admin and upload routes"
```

### Task 4: Add source-upload bridge metadata and write through to `source_documents`

**Files:**
- Create: `supabase/migrations/20260321130000_storage_source_document_bridge.sql`
- Create: `services/platform-api/app/services/storage_source_documents.py`
- Modify: `services/platform-api/app/api/routes/storage.py`
- Modify: `services/platform-api/tests/test_storage_routes.py`

**Step 1: Add a failing route test that proves `source_documents` is written on source upload completion**

```python
def test_complete_source_upload_writes_source_document(user_client, monkeypatch):
    calls = {}

    async def fake_upsert(*_args, **kwargs):
        calls["upserted"] = kwargs

    monkeypatch.setattr(
        "app.api.routes.storage.upsert_source_document_for_storage_object",
        fake_upsert,
    )

    response = user_client.post(
        "/storage/uploads/res-123/complete",
        json={"actual_bytes": 1234},
    )

    assert response.status_code == 200
    assert calls["upserted"]["source_uid"] == "abc123"
```

**Step 2: Extend the reservation schema with source-document metadata**

Only add what is missing from the current schema. `project_id` and `source_uid` already exist in [`20260319190000_102_user_storage_quota.sql`](/e:/writing-system/supabase/migrations/20260319190000_102_user_storage_quota.sql). The bridge migration should add `doc_title` and `source_type`, backfill safe defaults for pending rows, and extend the reservation RPC contract.

```sql
alter table public.storage_upload_reservations
  add column if not exists doc_title text,
  add column if not exists source_type text;

update public.storage_upload_reservations
   set doc_title = coalesce(doc_title, original_filename)
 where doc_title is null;
```

**Step 3: Extend the FastAPI request model and RPC payload**

```python
class CreateUploadRequest(BaseModel):
    project_id: str = Field(min_length=1)
    filename: str = Field(min_length=1)
    content_type: str = Field(min_length=1)
    expected_bytes: int = Field(ge=0)
    storage_kind: StorageKind = "source"
    source_uid: str | None = None
    source_type: str | None = None
    doc_title: str | None = None
    artifact_name: str | None = None
```

**Step 4: Write the source-document compatibility helper and call it from completion**

```python
async def upsert_source_document_for_storage_object(
    supabase_admin,
    *,
    owner_id: str,
    project_id: str | None,
    source_uid: str,
    source_type: str,
    doc_title: str,
    storage_object_id: str,
    object_key: str,
    bytes_used: int,
) -> None:
    payload = {
        "project_id": project_id,
        "source_uid": source_uid,
        "source_type": source_type,
        "doc_title": doc_title,
        "storage_object_id": storage_object_id,
        "storage_path": object_key,
        "byte_size": bytes_used,
    }
    supabase_admin.table("source_documents").upsert(payload, on_conflict="source_uid").execute()
```

Call it only for source uploads:

```python
if reservation["storage_kind"] == "source":
    await upsert_source_document_for_storage_object(
        supabase_admin,
        owner_id=auth.user_id,
        project_id=reservation.get("project_id"),
        source_uid=reservation["source_uid"],
        source_type=reservation["source_type"],
        doc_title=reservation.get("doc_title") or reservation["original_filename"],
        storage_object_id=result["storage_object_id"],
        object_key=result["object_key"],
        bytes_used=result["byte_size"],
    )
```

**Step 5: Run tests and commit**

Run: `cd services/platform-api && pytest tests/test_storage_routes.py -q`

Expected: PASS

```bash
git add supabase/migrations/20260321130000_storage_source_document_bridge.sql services/platform-api/app/services/storage_source_documents.py services/platform-api/app/api/routes/storage.py services/platform-api/tests/test_storage_routes.py
git commit -m "feat(storage): bridge source uploads into source documents"
```

### Task 5: Build a shared frontend storage upload client

**Files:**
- Create: `web/src/lib/storageUploadService.ts`
- Test: `web/src/lib/storageUploadService.test.ts`

**Step 1: Write the failing frontend unit tests first**

```ts
it("computes the same source_uid as the current ingest flow", async () => {
  const file = new File([new Uint8Array([1, 2, 3])], "sample.pdf", { type: "application/pdf" });
  const sourceUid = await computeSourceUid(file, "pdf");
  expect(sourceUid).toMatch(/^[0-9a-f]{64}$/);
});

it("prepares a source upload payload with doc_title and source_type", async () => {
  const file = new File(["hello"], "outline.md", { type: "text/markdown" });
  const prepared = await prepareSourceUpload(file, { docTitle: "Outline" });
  expect(prepared.doc_title).toBe("Outline");
  expect(prepared.source_type).toBe("markdown");
});
```

**Step 2: Implement the client helpers**

```ts
export async function prepareSourceUpload(
  file: File,
  options?: { docTitle?: string },
) {
  const sourceType = detectSourceTypeForUpload(file.name, file.type);
  const sourceUid = await computeSourceUid(file, sourceType);
  return {
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    expected_bytes: file.size,
    storage_kind: "source" as const,
    source_type: sourceType,
    source_uid: sourceUid,
    doc_title: options?.docTitle?.trim() || file.name,
  };
}
```

**Step 3: Implement the reservation-upload-complete flow**

```ts
export async function uploadWithReservation(params: {
  projectId: string;
  file: File;
  docTitle?: string;
}) {
  const prepared = await prepareSourceUpload(params.file, { docTitle: params.docTitle });
  const reservation = await platformApiJson("/storage/uploads", {
    method: "POST",
    body: JSON.stringify({ project_id: params.projectId, ...prepared }),
  });

  await fetch(reservation.signed_upload_url, {
    method: "PUT",
    headers: { "Content-Type": prepared.content_type },
    body: params.file,
  });

  return await platformApiJson(`/storage/uploads/${reservation.reservation_id}/complete`, {
    method: "POST",
    body: JSON.stringify({ actual_bytes: params.file.size }),
  });
}
```

**Step 4: Run frontend tests**

Run: `npm --prefix web run test -- src/lib/storageUploadService.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add web/src/lib/storageUploadService.ts web/src/lib/storageUploadService.test.ts
git commit -m "feat(frontend): add shared storage upload client"
```

### Task 6: Migrate every browser upload entry point to the shared storage client

**Files:**
- Modify: `web/src/hooks/useDirectUpload.ts`
- Modify: `web/src/components/documents/UploadTabPanel.tsx`
- Modify: `web/src/components/documents/ProjectParseUploader.tsx`
- Modify: `web/src/components/flows/FlowWorkbench.tsx`
- Modify: `web/src/pages/project-assets-sync.test.tsx`

**Step 1: Replace the legacy `edgeFetch('ingest')` path in `useDirectUpload.ts`**

Current seam: [`useDirectUpload.ts`](/e:/writing-system/web/src/hooks/useDirectUpload.ts) still posts a `FormData` payload to `edgeFetch('ingest')`.

Write the failing test first so it expects `uploadWithReservation()` instead of the edge function.

**Step 2: Switch `useDirectUpload()` to the shared client**

```ts
const result = await uploadWithReservation({
  projectId,
  file,
  docTitle: staged.relativePath || staged.file.name,
});
```

**Step 3: Keep the current uploader surfaces but swap their implementation**

- [`ProjectParseUploader.tsx`](/e:/writing-system/web/src/components/documents/ProjectParseUploader.tsx) should continue to use `useDirectUpload()`.
- [`UploadTabPanel.tsx`](/e:/writing-system/web/src/components/documents/UploadTabPanel.tsx) should keep its existing UI but refresh documents and quota after upload.
- [`FlowWorkbench.tsx`](/e:/writing-system/web/src/components/flows/FlowWorkbench.tsx) has two direct `edgeFetch('ingest')` upload paths at the current call sites near lines `698` and `806`; both must be migrated.

Representative replacement for `FlowWorkbench.tsx`:

```ts
const uploaded = await uploadWithReservation({
  projectId: currentProjectId,
  file,
  docTitle: file.name,
});

await Promise.all([
  refreshProjectDocuments(),
  refreshStorageQuota?.(),
]);
```

**Step 4: Run the targeted frontend tests**

Run: `npm --prefix web run test -- src/pages/project-assets-sync.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add web/src/hooks/useDirectUpload.ts web/src/components/documents/UploadTabPanel.tsx web/src/components/documents/ProjectParseUploader.tsx web/src/components/flows/FlowWorkbench.tsx web/src/pages/project-assets-sync.test.tsx
git commit -m "feat(frontend): migrate upload entry points to storage api"
```

### Task 7: Add visible quota status to the live Assets route

**Files:**
- Create: `web/src/hooks/useStorageQuota.ts`
- Create: `web/src/components/storage/StorageQuotaSummary.tsx`
- Modify: `web/src/pages/ProjectAssetsPage.tsx`
- Modify: `web/src/pages/useAssetsWorkbench.tsx`
- Test: `web/src/pages/ProjectAssetsPage.test.tsx`

**Step 1: Write the failing page test**

```ts
it("renders used, reserved, total, and remaining quota on the assets page", async () => {
  render(<ProjectAssetsPage />);
  expect(await screen.findByText(/5 GB total/i)).toBeInTheDocument();
  expect(screen.getByText(/4 GB remaining/i)).toBeInTheDocument();
});
```

**Step 2: Add the quota hook**

```ts
export function useStorageQuota() {
  const [state, setState] = useState<{ loading: boolean; data: StorageQuota | null; error: string | null }>({
    loading: true,
    data: null,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    const response = await platformApiFetch("/storage/quota");
    if (!response.ok) throw new Error(`Failed to load quota: ${response.status}`);
    const data = (await response.json()) as StorageQuota;
    setState({ loading: false, data, error: null });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
```

**Step 3: Add the visual summary component**

```tsx
export function StorageQuotaSummary({ quota, loading }: { quota: StorageQuota | null; loading: boolean }) {
  if (loading) return <div className="text-sm text-muted-foreground">Loading storage…</div>;
  if (!quota) return <div className="text-sm text-destructive">Storage unavailable</div>;

  const remaining = Math.max(quota.quota_bytes - quota.used_bytes - quota.reserved_bytes, 0);
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="text-sm font-medium">{formatBytes(quota.quota_bytes)} total</div>
      <div className="text-xs text-muted-foreground">
        {formatBytes(quota.used_bytes)} used • {formatBytes(quota.reserved_bytes)} reserved • {formatBytes(remaining)} remaining
      </div>
    </div>
  );
}
```

**Step 4: Mount the quota summary in the real assets page shell**

Add it to [`ProjectAssetsPage.tsx`](/e:/writing-system/web/src/pages/ProjectAssetsPage.tsx), not [`AssetsPanel.tsx`](/e:/writing-system/web/src/components/documents/AssetsPanel.tsx), so it is visible across the mounted assets experience.

**Step 5: Run tests and commit**

Run: `npm --prefix web run test -- src/pages/ProjectAssetsPage.test.tsx`

Expected: PASS

```bash
git add web/src/hooks/useStorageQuota.ts web/src/components/storage/StorageQuotaSummary.tsx web/src/pages/ProjectAssetsPage.tsx web/src/pages/useAssetsWorkbench.tsx web/src/pages/ProjectAssetsPage.test.tsx
git commit -m "feat(frontend): add assets storage quota visibility"
```

### Task 8: Replace the placeholder superuser workspace with storage policy and provisioning panels

**Files:**
- Create: `web/src/pages/superuser/SuperuserStoragePolicy.tsx`
- Create: `web/src/pages/superuser/SuperuserProvisioningMonitor.tsx`
- Modify: `web/src/pages/superuser/SuperuserWorkspace.tsx`
- Test: `web/src/pages/superuser/SuperuserWorkspaceStorage.test.tsx`

**Step 1: Write the failing workspace test first**

```ts
it("renders the storage policy panel and provisioning monitor", async () => {
  render(<Component />);
  expect(await screen.findByText(/default new-user quota/i)).toBeInTheDocument();
  expect(screen.getByText(/recent signup provisioning/i)).toBeInTheDocument();
});
```

**Step 2: Build the storage policy panel**

```tsx
export function SuperuserStoragePolicy() {
  const { data, isLoading } = useAdminStoragePolicy();

  return (
    <section className="flex h-full flex-col gap-3 p-3">
      <header>
        <h2 className="text-sm font-semibold">Default New-User Quota</h2>
        <p className="text-xs text-muted-foreground">Controls the storage entitlement assigned during signup.</p>
      </header>
      <StorageQuotaPolicyForm initialValue={data?.default_new_user_quota_bytes ?? null} loading={isLoading} />
    </section>
  );
}
```

**Step 3: Build the provisioning monitor panel**

```tsx
export function SuperuserProvisioningMonitor() {
  const { data, isLoading } = useRecentStorageProvisioning();

  return (
    <section className="flex h-full flex-col gap-3 p-3">
      <header>
        <h2 className="text-sm font-semibold">Recent Signup Provisioning</h2>
      </header>
      <ProvisioningTable rows={data?.items ?? []} loading={isLoading} />
    </section>
  );
}
```

**Step 4: Replace the placeholder tabs in `SuperuserWorkspace.tsx`**

The current page still renders literal `Placeholder` content. Replace that with tabs like:

- `storage-policy`
- `provisioning-monitor`
- existing platform panels if still needed

**Step 5: Run tests and commit**

Run: `npm --prefix web run test -- src/pages/superuser/SuperuserWorkspaceStorage.test.tsx`

Expected: PASS

```bash
git add web/src/pages/superuser/SuperuserStoragePolicy.tsx web/src/pages/superuser/SuperuserProvisioningMonitor.tsx web/src/pages/superuser/SuperuserWorkspace.tsx web/src/pages/superuser/SuperuserWorkspaceStorage.test.tsx
git commit -m "feat(superuser): add storage policy and provisioning monitor panels"
```

### Task 9: Run the end-to-end verification sweep

**Files:**
- Verify only; no new files expected in this task

**Step 1: Run backend verification**

Run:

```bash
cd services/platform-api
pytest tests/test_storage_helpers.py tests/test_storage_routes.py tests/test_admin_storage_routes.py -q
```

Expected: PASS

**Step 2: Run frontend verification**

Run:

```bash
npm --prefix web run test -- src/lib/storageUploadService.test.ts src/pages/ProjectAssetsPage.test.tsx src/pages/project-assets-sync.test.tsx src/pages/superuser/SuperuserWorkspaceStorage.test.tsx
```

Expected: PASS

**Step 3: Run the manual acceptance test**

1. Open the superuser storage page.
2. Set `default_new_user_quota_bytes` to `5368709120`.
3. Create a brand-new account with a new email.
4. Log in and confirm `Default Project` is focused.
5. Open Assets and confirm `0 used / 5 GB total / 5 GB remaining`.
6. Upload a `1 GB` file.
7. Confirm the file appears in the assets experience.
8. Confirm quota becomes `1 GB used / 4 GB remaining`.
9. Confirm the superuser provisioning monitor shows `auth.users`, `Default Project`, and `storage_quotas` all present.

**Step 4: Verify there are no remaining browser uploads hitting `edgeFetch('ingest')`**

Run:

```bash
git grep -n "edgeFetch('ingest')" web
```

Expected: no matches for browser-driven upload paths that should now use the storage API.

**Step 5: Commit the final verification adjustments**

```bash
git add -A
git commit -m "test(storage): verify signup provisioning and quota visibility"
```

## Explicit Risks Accepted In This Plan

1. Browser-side SHA-256 hashing remains acceptable for this phase because the current ingest path already computes content-addressed IDs client-side for browser uploads.
2. The app continues to rely on `source_documents` as the visible asset list spine in this phase; a future plan can remove that compatibility layer after the product moves fully to `storage_objects`.
3. Global policy changes apply to future users only. Existing-user bulk migration remains a separate product and operational decision.
4. Non-browser ingest flows are not expanded in this plan unless they already use the storage control plane.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked API surface in this plan exists exactly as specified.
2. The locked traces, metrics, and structured logs exist exactly as specified.
3. The inventory counts in this plan match the actual set of created and modified files.
4. No browser upload path still relies on the legacy Supabase `ingest` edge function for the affected user flows.
5. A brand-new user can be verified through the full signup acceptance contract without manual database repair.

Plan complete and saved to `docs/plans/user-storage/2026-03-21-user-storage-signup-verification-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch a fresh subagent per task, review between tasks, and keep momentum high inside this session.

**2. Parallel Session (separate)** - Open a new session in a worktree and execute this plan with `executing-plans` task-by-task.

Which approach?
