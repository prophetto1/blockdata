from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.api.routes.storage import (
    CreateUploadRequest,
    CompleteUploadRequest,
    create_upload,
    finalize_upload,
)


class AuthStub:
    def __init__(self, user_id: str):
        self.user_id = user_id


@pytest.mark.asyncio
async def test_create_upload_rejects_oversize(monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("USER_STORAGE_MAX_FILE_BYTES", "4")
    monkeypatch.setenv("GCS_USER_STORAGE_BUCKET", "unit-bucket")
    get_settings.cache_clear()

    monkeypatch.setattr("app.api.routes.storage._assert_project_ownership", lambda *_a, **_k: None)

    auth = AuthStub("user-1")
    req = CreateUploadRequest(
        project_id="project-1",
        filename="a.txt",
        content_type="text/plain",
        expected_bytes=10,
    )

    with pytest.raises(HTTPException) as exc:
        await create_upload(req, auth)
    assert exc.value.status_code == 413


@pytest.mark.asyncio
async def test_create_upload_requires_source_uid_for_source_kind(monkeypatch):
    from app.api.routes.storage import create_upload

    monkeypatch.setattr("app.api.routes.storage.get_settings", lambda: type("S", (), {
        "gcs_user_storage_bucket": "unit-bucket",
        "user_storage_max_file_bytes": 1024,
    })())
    monkeypatch.setattr("app.api.routes.storage._assert_project_ownership", lambda *_a, **_k: None)

    class _NoopAdmin:
        def rpc(self, *_args, **_kwargs):
            raise AssertionError("did not expect database call")

    monkeypatch.setattr("app.api.routes.storage.get_supabase_admin", lambda: _NoopAdmin())

    with pytest.raises(HTTPException) as exc:
        await create_upload(
            CreateUploadRequest(
                project_id="project-1",
                filename="a.txt",
                content_type="text/plain",
                expected_bytes=1,
                storage_kind="source",
            ),
            AuthStub("user-1"),
        )
    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_finalize_upload_returns_existing_for_completed_reservation(monkeypatch):
    reservation = {"status": "completed"}
    expected = {"storage_object_id": "obj-1", "reservation_id": "res-1"}

    monkeypatch.setattr("app.api.routes.storage._fetch_reservation", lambda *_a, **_k: reservation)
    monkeypatch.setattr(
        "app.api.routes.storage._fetch_storage_object_by_reservation",
        lambda *_a, **_k: expected,
    )

    result = await finalize_upload("res-1", CompleteUploadRequest(actual_bytes=None), AuthStub("user-1"))
    assert result == expected
