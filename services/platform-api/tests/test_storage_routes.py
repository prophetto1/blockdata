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

    monkeypatch.setattr("app.api.routes.storage.get_supabase_admin", lambda: object())
    monkeypatch.setattr("app.api.routes.storage._fetch_reservation", lambda *_a, **_k: reservation)
    monkeypatch.setattr(
        "app.api.routes.storage._fetch_storage_object_by_reservation",
        lambda *_a, **_k: expected,
    )

    result = await finalize_upload("res-1", CompleteUploadRequest(actual_bytes=None), AuthStub("user-1"))
    assert result == expected


@pytest.mark.asyncio
async def test_create_upload_records_reservation_observability(monkeypatch):
    recorded: list[dict] = []
    rpc_calls: list[tuple[str, dict]] = []

    monkeypatch.setattr("app.api.routes.storage.get_settings", lambda: type("S", (), {
        "gcs_user_storage_bucket": "unit-bucket",
        "user_storage_max_file_bytes": 1024,
    })())
    monkeypatch.setattr("app.api.routes.storage._assert_project_ownership", lambda *_a, **_k: None)
    monkeypatch.setattr("app.api.routes.storage.create_signed_upload_url", lambda **_k: "https://upload.test")
    monkeypatch.setattr(
        "app.api.routes.storage.record_storage_upload_reserve",
        lambda **kwargs: recorded.append(kwargs),
    )

    class _Admin:
        def rpc(self, function_name, payload):
            rpc_calls.append((function_name, payload))

            class _Exec:
                data = {
                    "reservation_id": "res-1",
                    "bucket": "unit-bucket",
                    "object_key": "users/user-1/assets/projects/project-1/sources/src-1/source/a.txt",
                    "requested_bytes": 1,
                    "status": "pending",
                }

                def execute(self):
                    return self

            return _Exec()

    monkeypatch.setattr("app.api.routes.storage.get_supabase_admin", lambda: _Admin())

    result = await create_upload(
        CreateUploadRequest(
            project_id="project-1",
            filename="a.txt",
            content_type="text/plain",
            expected_bytes=1,
            storage_kind="source",
            source_uid="src-1",
            source_type="txt",
            doc_title="folder/a.txt",
        ),
        AuthStub("user-1"),
    )

    assert result["reservation_id"] == "res-1"
    assert recorded
    assert recorded[0]["result"] == "ok"
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
            },
        ),
    ]


@pytest.mark.asyncio
async def test_create_upload_defaults_source_uploads_to_assets_surface_prefix(monkeypatch):
    rpc_calls: list[tuple[str, dict]] = []

    monkeypatch.setattr("app.api.routes.storage.get_settings", lambda: type("S", (), {
        "gcs_user_storage_bucket": "unit-bucket",
        "user_storage_max_file_bytes": 1024,
    })())
    monkeypatch.setattr("app.api.routes.storage._assert_project_ownership", lambda *_a, **_k: None)
    monkeypatch.setattr("app.api.routes.storage.create_signed_upload_url", lambda **_k: "https://upload.test")

    class _Admin:
        def rpc(self, function_name, payload):
            rpc_calls.append((function_name, payload))

            class _Exec:
                data = {
                    "reservation_id": "res-1",
                    "bucket": "unit-bucket",
                    "object_key": payload["p_object_key"],
                    "requested_bytes": 1,
                    "status": "pending",
                }

                def execute(self):
                    return self

            return _Exec()

    monkeypatch.setattr("app.api.routes.storage.get_supabase_admin", lambda: _Admin())

    result = await create_upload(
        CreateUploadRequest(
            project_id="project-1",
            filename="a.md",
            content_type="text/markdown",
            expected_bytes=1,
            storage_kind="source",
            source_uid="src-1",
            source_type="md",
            doc_title="Docs/a.md",
        ),
        AuthStub("user-1"),
    )

    assert result["object_key"] == "users/user-1/assets/projects/project-1/sources/src-1/source/a.md"
    assert rpc_calls[0][1]["p_object_key"] == "users/user-1/assets/projects/project-1/sources/src-1/source/a.md"


@pytest.mark.asyncio
async def test_create_upload_routes_pipeline_services_uploads_to_service_prefix(monkeypatch):
    rpc_calls: list[tuple[str, dict]] = []

    monkeypatch.setattr("app.api.routes.storage.get_settings", lambda: type("S", (), {
        "gcs_user_storage_bucket": "unit-bucket",
        "user_storage_max_file_bytes": 1024,
    })())
    monkeypatch.setattr("app.api.routes.storage._assert_project_ownership", lambda *_a, **_k: None)
    monkeypatch.setattr("app.api.routes.storage.create_signed_upload_url", lambda **_k: "https://upload.test")

    class _Admin:
        def rpc(self, function_name, payload):
            rpc_calls.append((function_name, payload))

            class _Exec:
                data = {
                    "reservation_id": "res-1",
                    "bucket": "unit-bucket",
                    "object_key": payload["p_object_key"],
                    "requested_bytes": 1,
                    "status": "pending",
                }

                def execute(self):
                    return self

            return _Exec()

    monkeypatch.setattr("app.api.routes.storage.get_supabase_admin", lambda: _Admin())

    result = await create_upload(
        CreateUploadRequest(
            project_id="project-1",
            filename="a.md",
            content_type="text/markdown",
            expected_bytes=1,
            storage_kind="source",
            source_uid="src-1",
            source_type="md",
            doc_title="Docs/a.md",
            storage_surface="pipeline-services",
            storage_service_slug="index-builder",
        ),
        AuthStub("user-1"),
    )

    assert result["object_key"] == (
        "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-1/source/a.md"
    )
    assert rpc_calls[0][1]["p_object_key"] == (
        "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-1/source/a.md"
    )


@pytest.mark.asyncio
async def test_create_upload_requires_service_slug_for_pipeline_services_surface(monkeypatch):
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
                filename="a.md",
                content_type="text/markdown",
                expected_bytes=1,
                storage_kind="source",
                source_uid="src-1",
                source_type="md",
                doc_title="Docs/a.md",
                storage_surface="pipeline-services",
            ),
            AuthStub("user-1"),
        )

    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_finalize_source_upload_writes_source_document(monkeypatch):
    calls: list[dict] = []

    reservation = {
        "reservation_id": "res-1",
        "owner_user_id": "user-1",
        "project_id": "project-1",
        "bucket": "unit-bucket",
        "object_key": "users/user-1/assets/projects/project-1/sources/abc123/source/outline.pdf",
        "requested_bytes": 1234,
        "content_type": "application/pdf",
        "original_filename": "outline.pdf",
        "storage_kind": "source",
        "source_uid": "abc123",
        "source_type": "pdf",
        "doc_title": "Folder/Outline.pdf",
        "status": "pending",
    }

    monkeypatch.setattr("app.api.routes.storage._fetch_reservation", lambda *_a, **_k: reservation)
    monkeypatch.setattr("app.api.routes.storage.get_object_size_bytes", lambda *_a, **_k: 1234)
    monkeypatch.setattr("app.api.routes.storage.record_storage_upload_complete", lambda **_kwargs: None)
    monkeypatch.setattr(
        "app.api.routes.storage.upsert_source_document_for_storage_object",
        lambda _admin, **kwargs: calls.append(kwargs),
    )

    class _Admin:
        def rpc(self, *_args, **_kwargs):
            class _Exec:
                data = {
                    "storage_object_id": "obj-1",
                    "reservation_id": "res-1",
                    "object_key": "users/user-1/assets/projects/project-1/sources/abc123/source/outline.pdf",
                    "byte_size": 1234,
                    "storage_kind": "source",
                }

                def execute(self):
                    return self

            return _Exec()

    monkeypatch.setattr("app.api.routes.storage.get_supabase_admin", lambda: _Admin())

    result = await finalize_upload(
        "res-1",
        CompleteUploadRequest(actual_bytes=1234),
        AuthStub("user-1"),
    )

    assert result["storage_object_id"] == "obj-1"
    assert calls == [
        {
            "owner_id": "user-1",
            "project_id": "project-1",
            "source_uid": "abc123",
            "source_type": "pdf",
            "doc_title": "Folder/Outline.pdf",
            "storage_object_id": "obj-1",
            "object_key": "users/user-1/assets/projects/project-1/sources/abc123/source/outline.pdf",
            "bytes_used": 1234,
        }
    ]


@pytest.mark.asyncio
async def test_create_upload_hides_signed_url_internal_error(monkeypatch):
    monkeypatch.setattr("app.api.routes.storage.get_settings", lambda: type("S", (), {
        "gcs_user_storage_bucket": "unit-bucket",
        "user_storage_max_file_bytes": 1024,
    })())
    monkeypatch.setattr("app.api.routes.storage._assert_project_ownership", lambda *_a, **_k: None)
    monkeypatch.setattr(
        "app.api.routes.storage.create_signed_upload_url",
        lambda **_k: (_ for _ in ()).throw(RuntimeError("gcs exploded")),
    )

    class _Admin:
        def rpc(self, *_args, **_kwargs):
            class _Exec:
                data = {
                    "reservation_id": "res-1",
                    "bucket": "unit-bucket",
                    "object_key": "users/user-1/assets/projects/project-1/sources/src-1/source/a.txt",
                    "requested_bytes": 1,
                    "status": "pending",
                }

                def execute(self):
                    return self

            return _Exec()

    monkeypatch.setattr("app.api.routes.storage.get_supabase_admin", lambda: _Admin())

    with pytest.raises(HTTPException) as exc:
        await create_upload(
            CreateUploadRequest(
                project_id="project-1",
                filename="a.txt",
                content_type="text/plain",
                expected_bytes=1,
                storage_kind="source",
                source_uid="src-1",
                source_type="txt",
                doc_title="folder/a.txt",
            ),
            AuthStub("user-1"),
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == "Failed to create signed upload URL"
