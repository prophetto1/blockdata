# User Storage Quota FastAPI GCS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first backend slice of per-user `50 GB` storage allocation using Supabase for quota metadata, FastAPI for upload orchestration, and GCS for stored bytes.

**Architecture:** Supabase owns quota, reservation, and storage-object metadata through new tables and atomic RPCs. FastAPI becomes the storage control plane: it authenticates the user, reserves quota, issues signed GCS upload targets, and finalizes or cancels uploads. GCS stores the actual files under user/project-scoped object keys.

**Tech Stack:** Supabase Postgres migrations and RPCs, Python FastAPI, Google Cloud Storage signed URLs, Supabase Python client, pytest

---

### Task 1: Add storage quota schema and transactional RPCs

**Files:**
- Create: `supabase/migrations/20260319173000_102_user_storage_quota.sql`
- Reference: `supabase/migrations/20260317210000_099_default_project_on_signup.sql`

**Step 1: Write the migration**

Create `supabase/migrations/20260319173000_102_user_storage_quota.sql` with:

```sql
-- Tables

CREATE TABLE IF NOT EXISTS public.storage_quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  quota_bytes BIGINT NOT NULL DEFAULT 53687091200,
  used_bytes BIGINT NOT NULL DEFAULT 0,
  reserved_bytes BIGINT NOT NULL DEFAULT 0,
  plan_code TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT storage_quotas_non_negative CHECK (
    quota_bytes >= 0 AND used_bytes >= 0 AND reserved_bytes >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.storage_objects (
  storage_object_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.user_projects(project_id) ON DELETE SET NULL,
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
  content_type TEXT NOT NULL,
  storage_kind TEXT NOT NULL DEFAULT 'source',
  source_uid TEXT,
  checksum_sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket, object_key)
);

CREATE TABLE IF NOT EXISTS public.storage_upload_reservations (
  reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.user_projects(project_id) ON DELETE SET NULL,
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL,
  requested_bytes BIGINT NOT NULL CHECK (requested_bytes >= 0),
  content_type TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_kind TEXT NOT NULL DEFAULT 'source',
  source_uid TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Extend signup trigger to provision a quota row for new users

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'display_name', '')
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name);

  INSERT INTO public.user_projects (owner_id, project_name, description)
  VALUES (NEW.id, 'Default Project', 'Auto-created on signup')
  ON CONFLICT (owner_id, project_name) DO NOTHING;

  INSERT INTO public.storage_quotas (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill: provision quota rows for existing users who have none
INSERT INTO public.storage_quotas (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.storage_quotas)
ON CONFLICT (user_id) DO NOTHING;

-- Atomic RPCs

CREATE OR REPLACE FUNCTION public.reserve_user_storage(
  p_user_id UUID,
  p_project_id UUID,
  p_bucket TEXT,
  p_object_key TEXT,
  p_requested_bytes BIGINT,
  p_content_type TEXT,
  p_original_filename TEXT,
  p_storage_kind TEXT DEFAULT 'source',
  p_source_uid TEXT DEFAULT NULL
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
  SELECT * INTO v_quota
  FROM public.storage_quotas
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'storage quota not provisioned for user %', p_user_id;
  END IF;

  IF v_quota.used_bytes + v_quota.reserved_bytes + p_requested_bytes > v_quota.quota_bytes THEN
    RAISE EXCEPTION 'storage quota exceeded';
  END IF;

  UPDATE public.storage_quotas
  SET reserved_bytes = reserved_bytes + p_requested_bytes,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.storage_upload_reservations (
    owner_user_id, project_id, bucket, object_key, requested_bytes,
    content_type, original_filename, storage_kind, source_uid, expires_at
  )
  VALUES (
    p_user_id, p_project_id, p_bucket, p_object_key, p_requested_bytes,
    p_content_type, p_original_filename, p_storage_kind, p_source_uid, now() + interval '30 minutes'
  )
  RETURNING * INTO v_reservation;

  RETURN v_reservation;
END;
$$;

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
  SELECT * INTO v_reservation
  FROM public.storage_upload_reservations
  WHERE reservation_id = p_reservation_id
    AND owner_user_id = p_owner_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reservation not found';
  END IF;

  IF v_reservation.status <> 'pending' THEN
    RAISE EXCEPTION 'reservation already % — cannot complete', v_reservation.status;
  END IF;

  v_finalized_bytes := COALESCE(p_actual_bytes, v_reservation.requested_bytes);

  -- Release the reservation hold and book finalized bytes
  UPDATE public.storage_quotas
  SET reserved_bytes = reserved_bytes - v_reservation.requested_bytes,
      used_bytes     = used_bytes + v_finalized_bytes,
      updated_at     = now()
  WHERE user_id = p_owner_user_id;

  UPDATE public.storage_upload_reservations
  SET status = 'completed', completed_at = now()
  WHERE reservation_id = p_reservation_id;

  INSERT INTO public.storage_objects (
    owner_user_id, project_id, bucket, object_key, byte_size,
    content_type, storage_kind, source_uid, checksum_sha256
  )
  VALUES (
    v_reservation.owner_user_id, v_reservation.project_id,
    v_reservation.bucket, v_reservation.object_key, v_finalized_bytes,
    v_reservation.content_type, v_reservation.storage_kind,
    v_reservation.source_uid, p_checksum_sha256
  )
  ON CONFLICT (bucket, object_key) DO UPDATE
    SET byte_size = EXCLUDED.byte_size,
        checksum_sha256 = EXCLUDED.checksum_sha256,
        status = 'active'
  RETURNING * INTO v_object;

  RETURN v_object;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_user_storage_reservation(
  p_reservation_id UUID,
  p_owner_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reservation public.storage_upload_reservations;
BEGIN
  SELECT * INTO v_reservation
  FROM public.storage_upload_reservations
  WHERE reservation_id = p_reservation_id
    AND owner_user_id = p_owner_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reservation not found';
  END IF;

  IF v_reservation.status <> 'pending' THEN
    RETURN; -- idempotent: already cancelled or completed
  END IF;

  UPDATE public.storage_quotas
  SET reserved_bytes = reserved_bytes - v_reservation.requested_bytes,
      updated_at     = now()
  WHERE user_id = p_owner_user_id;

  UPDATE public.storage_upload_reservations
  SET status = 'cancelled'
  WHERE reservation_id = p_reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_expired_storage_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.storage_upload_reservations;
  v_count INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT * FROM public.storage_upload_reservations
    WHERE status = 'pending' AND expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.storage_quotas
    SET reserved_bytes = reserved_bytes - v_row.requested_bytes,
        updated_at     = now()
    WHERE user_id = v_row.owner_user_id;

    UPDATE public.storage_upload_reservations
    SET status = 'cancelled'
    WHERE reservation_id = v_row.reservation_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
```

**Step 2: Run migration to verify it applies**

Run: `npx supabase migration up`
Expected: migration applies cleanly and `storage_quotas`, `storage_objects`, and `storage_upload_reservations` exist.

**Step 3: Commit**

```bash
git add supabase/migrations/20260319173000_102_user_storage_quota.sql
git commit -m "feat: add user storage quota schema and rpc helpers"
```

### Task 2: Add GCS settings and storage helpers to FastAPI

**Files:**
- Modify: `services/platform-api/requirements.txt`
- Modify: `services/platform-api/app/core/config.py`
- Create: `services/platform-api/app/infra/gcs_user_storage.py`
- Test: `services/platform-api/tests/test_gcs_user_storage.py`

**Step 1: Write the failing test**

Create `services/platform-api/tests/test_gcs_user_storage.py`:

```python
import pytest

from app.infra.gcs_user_storage import build_object_key, enforce_per_file_limit


def test_build_object_key_uses_user_project_and_source_ids():
    key = build_object_key(
        user_id="u1",
        project_id="p1",
        source_uid="s1",
        filename="report.pdf",
        kind="original",
    )
    assert key == "users/u1/projects/p1/sources/s1/original/report.pdf"


def test_enforce_per_file_limit_rejects_large_upload():
    with pytest.raises(ValueError, match="file too large"):
        enforce_per_file_limit(3 * 1024 * 1024, 2 * 1024 * 1024)
```

**Step 2: Run test to verify it fails**

Run: `cd services/platform-api && python -m pytest tests/test_gcs_user_storage.py -v`
Expected: FAIL with `ModuleNotFoundError` for `app.infra.gcs_user_storage`.

**Step 3: Add dependency and settings**

Append to `services/platform-api/requirements.txt`:

```text
google-cloud-storage>=2.19
```

Modify `services/platform-api/app/core/config.py`. The `Settings` dataclass uses a manual `from_env()` classmethod — **both** the field declaration and the `from_env()` body must be updated:

```python
@dataclass(frozen=True)
class Settings:
    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    platform_api_m2m_token: str = ""
    conversion_service_key: str = ""
    log_level: str = "INFO"
    gcs_user_storage_bucket: Optional[str] = None        # ADD
    user_storage_max_file_bytes: int = 1073741824         # ADD

    @classmethod
    def from_env(cls) -> "Settings":
        m2m = os.environ.get("PLATFORM_API_M2M_TOKEN", "")
        conv_key = os.environ.get("CONVERSION_SERVICE_KEY", "")
        return cls(
            supabase_url=_env_or_none("SUPABASE_URL"),
            supabase_service_role_key=_env_or_none("SUPABASE_SERVICE_ROLE_KEY"),
            platform_api_m2m_token=m2m or conv_key,
            conversion_service_key=conv_key or m2m,
            log_level=os.environ.get("LOG_LEVEL", "INFO"),
            gcs_user_storage_bucket=_env_or_none("GCS_USER_STORAGE_BUCKET"),                              # ADD
            user_storage_max_file_bytes=int(os.environ.get("USER_STORAGE_MAX_FILE_BYTES", "1073741824")), # ADD
        )
```

**Step 4: Implement the helper module**

Create `services/platform-api/app/infra/gcs_user_storage.py`:

```python
from datetime import timedelta
from pathlib import PurePosixPath

from google.cloud import storage as gcs


def build_object_key(user_id: str, project_id: str, source_uid: str, filename: str, kind: str) -> str:
    name = PurePosixPath(filename).name
    return f"users/{user_id}/projects/{project_id}/sources/{source_uid}/{kind}/{name}"


def enforce_per_file_limit(size_bytes: int, max_bytes: int) -> None:
    if size_bytes > max_bytes:
        raise ValueError("file too large")


def create_signed_upload_url(bucket_name: str, object_key: str, content_type: str) -> str:
    """Generate a v4 signed PUT URL for direct GCS upload.

    Requires a service account key — either via GOOGLE_APPLICATION_CREDENTIALS
    pointing at a service account JSON file, or Workload Identity in GKE.
    User credentials from `gcloud auth login` will NOT work with v4 signed URLs.
    """
    client = gcs.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(object_key)
    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=30),
        method="PUT",
        content_type=content_type,
    )
```

**Step 5: Run test to verify it passes**

Run: `cd services/platform-api && python -m pytest tests/test_gcs_user_storage.py -v`
Expected: PASS (the two pure-logic tests do not import `gcs.Client`).

**Step 6: Commit**

```bash
git add services/platform-api/requirements.txt services/platform-api/app/core/config.py services/platform-api/app/infra/gcs_user_storage.py services/platform-api/tests/test_gcs_user_storage.py
git commit -m "feat: add gcs storage helpers for user uploads"
```

### Task 3: Add a storage service layer that talks to Supabase RPCs

**Files:**
- Create: `services/platform-api/app/domain/storage/__init__.py`
- Create: `services/platform-api/app/domain/storage/service.py`
- Create: `services/platform-api/app/domain/storage/models.py`
- Test: `services/platform-api/tests/test_storage_service.py`
- Reference: `services/platform-api/app/infra/supabase_client.py`

**Step 1: Write the failing test**

Create `services/platform-api/tests/test_storage_service.py`:

```python
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.domain.storage.service import reserve_upload, get_quota


def _reservation_row():
    return {
        "reservation_id": "r1",
        "bucket": "my-bucket",
        "object_key": "users/u1/projects/p1/sources/s1/original/report.pdf",
        "requested_bytes": 123,
        "status": "pending",
    }


def test_reserve_upload_calls_supabase_rpc():
    admin = MagicMock()
    admin.rpc.return_value.execute.return_value = SimpleNamespace(data=_reservation_row())

    row = reserve_upload(
        admin=admin,
        user_id="u1",
        project_id="p1",
        bucket="my-bucket",
        object_key="users/u1/projects/p1/sources/s1/original/report.pdf",
        requested_bytes=123,
        content_type="application/pdf",
        original_filename="report.pdf",
        storage_kind="source",
        source_uid="s1",
    )

    assert row["reservation_id"] == "r1"
    admin.rpc.assert_called_once()


def test_get_quota_returns_dict():
    admin = MagicMock()
    admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = SimpleNamespace(
        data={"user_id": "u1", "quota_bytes": 53687091200, "used_bytes": 0, "reserved_bytes": 0, "plan_code": "free"}
    )

    quota = get_quota(admin=admin, user_id="u1")
    assert quota["quota_bytes"] == 53687091200
```

**Step 2: Run test to verify it fails**

Run: `cd services/platform-api && python -m pytest tests/test_storage_service.py -v`
Expected: FAIL because `app.domain.storage.service` does not exist.

**Step 3: Implement the service and models**

Create `services/platform-api/app/domain/storage/__init__.py` (empty).

Create `services/platform-api/app/domain/storage/models.py`:

```python
from pydantic import BaseModel
from typing import Optional


class UploadReservation(BaseModel):
    reservation_id: str
    bucket: str
    object_key: str
    requested_bytes: int
    status: str


class StorageQuota(BaseModel):
    user_id: str
    quota_bytes: int
    used_bytes: int
    reserved_bytes: int
    plan_code: str
```

Create `services/platform-api/app/domain/storage/service.py`:

```python
from app.domain.storage.models import StorageQuota, UploadReservation


def reserve_upload(
    *, admin, user_id: str, project_id: str | None, bucket: str, object_key: str,
    requested_bytes: int, content_type: str, original_filename: str,
    storage_kind: str, source_uid: str | None,
) -> dict:
    result = admin.rpc("reserve_user_storage", {
        "p_user_id": user_id,
        "p_project_id": project_id,
        "p_bucket": bucket,
        "p_object_key": object_key,
        "p_requested_bytes": requested_bytes,
        "p_content_type": content_type,
        "p_original_filename": original_filename,
        "p_storage_kind": storage_kind,
        "p_source_uid": source_uid,
    }).execute()
    return UploadReservation.model_validate(result.data).model_dump()


def complete_upload(
    *, admin, reservation_id: str, owner_user_id: str,
    actual_bytes: int | None = None, checksum_sha256: str | None = None,
) -> dict:
    result = admin.rpc("complete_user_storage_upload", {
        "p_reservation_id": reservation_id,
        "p_owner_user_id": owner_user_id,
        "p_actual_bytes": actual_bytes,
        "p_checksum_sha256": checksum_sha256,
    }).execute()
    return result.data


def cancel_upload(*, admin, reservation_id: str, owner_user_id: str) -> None:
    admin.rpc("cancel_user_storage_reservation", {
        "p_reservation_id": reservation_id,
        "p_owner_user_id": owner_user_id,
    }).execute()


def get_quota(*, admin, user_id: str) -> dict:
    result = (
        admin.table("storage_quotas")
        .select("*")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return StorageQuota.model_validate(result.data).model_dump()
```

**Step 4: Run test to verify it passes**

Run: `cd services/platform-api && python -m pytest tests/test_storage_service.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add services/platform-api/app/domain/storage services/platform-api/tests/test_storage_service.py
git commit -m "feat: add storage domain service backed by supabase rpcs"
```

### Task 4: Add authenticated FastAPI storage routes

**Files:**
- Create: `services/platform-api/app/api/routes/storage.py`
- Modify: `services/platform-api/app/main.py`
- Test: `services/platform-api/tests/test_storage_routes.py`
- Reference: `services/platform-api/app/auth/dependencies.py`

**Step 1: Write the failing route test**

Create `services/platform-api/tests/test_storage_routes.py`:

```python
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")
    monkeypatch.setenv("GCS_USER_STORAGE_BUCKET", "test-bucket")

    from app.core.config import get_settings
    from app.infra.supabase_client import get_supabase_admin
    get_settings.cache_clear()
    get_supabase_admin.cache_clear()

    from app.main import create_app
    app = create_app()
    with TestClient(app) as c:
        yield c

    get_settings.cache_clear()
    get_supabase_admin.cache_clear()


def test_storage_quota_requires_auth(client):
    resp = client.get("/storage/quota")
    assert resp.status_code == 401


def test_create_upload_requires_auth(client):
    resp = client.post("/storage/uploads", json={
        "project_id": "p1", "source_uid": "s1", "filename": "f.pdf",
        "content_type": "application/pdf", "expected_bytes": 100,
    })
    assert resp.status_code == 401


@patch("app.api.routes.storage.create_signed_upload_url", return_value="https://signed.example/upload")
@patch("app.api.routes.storage.get_supabase_admin")
@patch("app.auth.dependencies._verify_supabase_jwt")
def test_create_upload_returns_signed_url(mock_jwt, mock_admin_fn, mock_signed_url, client):
    from app.auth.principals import AuthPrincipal
    mock_jwt.return_value = MagicMock(id="u1", email="user@example.com")

    mock_admin = MagicMock()
    mock_admin.rpc.return_value.execute.return_value.data = {
        "reservation_id": "r1",
        "bucket": "test-bucket",
        "object_key": "users/u1/projects/p1/sources/s1/original/f.pdf",
        "requested_bytes": 100,
        "status": "pending",
    }
    mock_admin_fn.return_value = mock_admin

    # Patch superuser check to avoid real DB call
    with patch("app.auth.dependencies._check_superuser", return_value=False):
        resp = client.post(
            "/storage/uploads",
            json={
                "project_id": "p1", "source_uid": "s1", "filename": "f.pdf",
                "content_type": "application/pdf", "expected_bytes": 100,
            },
            headers={"Authorization": "Bearer fake-jwt"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["signed_upload_url"] == "https://signed.example/upload"
    assert body["reservation_id"] == "r1"
```

**Step 2: Run test to verify it fails**

Run: `cd services/platform-api && python -m pytest tests/test_storage_routes.py -v`
Expected: FAIL because the route does not exist.

**Step 3: Implement the route**

Create `services/platform-api/app/api/routes/storage.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import require_user_auth
from app.infra.gcs_user_storage import build_object_key, create_signed_upload_url, enforce_per_file_limit
from app.infra.supabase_client import get_supabase_admin
from app.core.config import get_settings
from app.domain.storage.service import cancel_upload, complete_upload, get_quota, reserve_upload

router = APIRouter(prefix="/storage", tags=["storage"])


class CreateUploadRequest(BaseModel):
    project_id: str
    source_uid: str
    filename: str
    content_type: str
    expected_bytes: int
    storage_kind: str = "source"


class CompleteUploadRequest(BaseModel):
    actual_bytes: int | None = None
    checksum_sha256: str | None = None


@router.get("/quota")
async def read_storage_quota(auth=Depends(require_user_auth)):
    admin = get_supabase_admin()
    return get_quota(admin=admin, user_id=auth.user_id)


@router.post("/uploads")
async def create_upload(body: CreateUploadRequest, auth=Depends(require_user_auth)):
    settings = get_settings()
    if not settings.gcs_user_storage_bucket:
        raise HTTPException(status_code=500, detail="GCS_USER_STORAGE_BUCKET is not configured")

    try:
        enforce_per_file_limit(body.expected_bytes, settings.user_storage_max_file_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=413, detail=str(exc))

    object_key = build_object_key(auth.user_id, body.project_id, body.source_uid, body.filename, "original")
    admin = get_supabase_admin()

    try:
        reservation = reserve_upload(
            admin=admin,
            user_id=auth.user_id,
            project_id=body.project_id,
            bucket=settings.gcs_user_storage_bucket,
            object_key=object_key,
            requested_bytes=body.expected_bytes,
            content_type=body.content_type,
            original_filename=body.filename,
            storage_kind=body.storage_kind,
            source_uid=body.source_uid,
        )
    except Exception as exc:
        msg = str(exc)
        if "quota exceeded" in msg:
            raise HTTPException(status_code=402, detail="Storage quota exceeded")
        raise HTTPException(status_code=500, detail="Failed to reserve storage")

    signed_url = create_signed_upload_url(settings.gcs_user_storage_bucket, object_key, body.content_type)
    return {**reservation, "signed_upload_url": signed_url}


@router.post("/uploads/{reservation_id}/complete")
async def finalize_upload(
    reservation_id: str,
    body: CompleteUploadRequest,
    auth=Depends(require_user_auth),
):
    admin = get_supabase_admin()
    result = complete_upload(
        admin=admin,
        reservation_id=reservation_id,
        owner_user_id=auth.user_id,
        actual_bytes=body.actual_bytes,
        checksum_sha256=body.checksum_sha256,
    )
    return result


@router.delete("/uploads/{reservation_id}", status_code=204)
async def delete_upload(reservation_id: str, auth=Depends(require_user_auth)):
    admin = get_supabase_admin()
    cancel_upload(admin=admin, reservation_id=reservation_id, owner_user_id=auth.user_id)
```

**Step 4: Mount the router**

In `services/platform-api/app/main.py`, add a new section `# 5e` before the plugin catch-all (section 6):

```python
    # 5e. Storage quota and uploads (user-scoped, before plugin catch-all)
    from app.api.routes.storage import router as storage_router
    app.include_router(storage_router)
```

**Step 5: Run tests to verify the route works**

Run: `cd services/platform-api && python -m pytest tests/test_storage_routes.py tests/test_routes.py -v`
Expected: PASS

**Step 6: Commit**

```bash
git add services/platform-api/app/api/routes/storage.py services/platform-api/app/main.py services/platform-api/tests/test_storage_routes.py
git commit -m "feat: add fastapi storage quota and upload reservation routes"
```

### Task 5: Add expiry cleanup worker

**Files:**
- Create: `services/platform-api/app/workers/storage_cleanup.py`
- Test: `services/platform-api/tests/test_storage_cleanup.py`

Note: The SQL for `release_expired_storage_reservations` was already included in full in Task 1.

**Step 1: Write the failing cleanup test**

Create `services/platform-api/tests/test_storage_cleanup.py`:

```python
from unittest.mock import MagicMock

from app.workers.storage_cleanup import release_expired_reservations


def test_release_expired_reservations_calls_rpc():
    admin = MagicMock()
    admin.rpc.return_value.execute.return_value.data = 3
    count = release_expired_reservations(admin)
    admin.rpc.assert_called_once_with("release_expired_storage_reservations")
    assert count == 3


def test_release_expired_reservations_handles_null_data():
    admin = MagicMock()
    admin.rpc.return_value.execute.return_value.data = None
    count = release_expired_reservations(admin)
    assert count == 0
```

**Step 2: Run test to verify it fails**

Run: `cd services/platform-api && python -m pytest tests/test_storage_cleanup.py -v`
Expected: FAIL because `app.workers.storage_cleanup` does not exist.

**Step 3: Implement the cleanup worker**

Create `services/platform-api/app/workers/storage_cleanup.py`:

```python
def release_expired_reservations(admin) -> int:
    result = admin.rpc("release_expired_storage_reservations").execute()
    return int(result.data or 0)
```

**Step 4: Run test to verify it passes**

Run: `cd services/platform-api && python -m pytest tests/test_storage_cleanup.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add services/platform-api/app/workers/storage_cleanup.py services/platform-api/tests/test_storage_cleanup.py
git commit -m "feat: add expired reservation cleanup worker"
```

## Environment notes

- **GCS signed URLs**: `create_signed_upload_url` uses `google-cloud-storage` v4 signed URLs, which require a service account key. Set `GOOGLE_APPLICATION_CREDENTIALS` to the path of a service account JSON file, or use Workload Identity in GKE. User credentials from `gcloud auth login` will fail at signing time. Tests should mock `create_signed_upload_url` to avoid this.
- **Supabase CLI**: Run migrations with `npx supabase migration up` (or `supabase migration up` if the CLI is on PATH).
- **`get_supabase_admin` cache**: Route tests must call `get_supabase_admin.cache_clear()` before and after, since it is `lru_cache`d. The route test `client` fixture above handles this.

## Follow-up work not included in this plan

- switching `web/src/hooks/useDirectUpload.ts` from the Supabase ingest edge function to the new FastAPI storage endpoints
- switching `web/src/components/documents/useUppyTransport.ts` to direct signed uploads
- reconciling current `source_documents.source_locator` creation with the new storage-object registry
- adding paid plan management and workspace-level quota owners
