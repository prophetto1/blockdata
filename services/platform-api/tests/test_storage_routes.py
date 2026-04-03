from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.api.routes.storage import (
    CreateUploadRequest,
    CompleteUploadRequest,
    create_upload,
    delete_storage_object,
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
                "p_storage_surface": "assets",
                "p_storage_service_slug": None,
            },
        ),
    ]


@pytest.mark.asyncio
async def test_delete_storage_object_reconciles_assets_metadata(monkeypatch):
    deleted_object = {
        "storage_object_id": "obj-1",
        "owner_user_id": "user-1",
        "project_id": "project-1",
        "bucket": "unit-bucket",
        "object_key": "users/user-1/assets/projects/project-1/sources/src-1/source/guide.md",
        "byte_size": 12,
        "storage_kind": "source",
        "storage_surface": "assets",
        "storage_service_slug": None,
        "source_uid": "src-1",
        "status": "deleted",
    }
    table_calls: list[tuple[str, dict[str, object]]] = []
    object_delete_calls: list[tuple[str, str]] = []
    metrics: list[dict] = []

    class _DeleteQuery:
        def __init__(self, table_name: str):
            self._table_name = table_name
            self._filters: dict[str, object] = {}

        def delete(self):
            return self

        def eq(self, key: str, value: object):
            self._filters[key] = value
            return self

        def execute(self):
            table_calls.append((self._table_name, dict(self._filters)))
            return type("R", (), {"data": [{"ok": True}]})()

    class _Exec:
        data = deleted_object

        def execute(self):
            return self

    class _Admin:
        def rpc(self, function_name, payload):
            assert function_name == "delete_user_storage_object"
            assert payload == {
                "p_user_id": "user-1",
                "p_storage_object_id": "obj-1",
            }
            return _Exec()

        def table(self, table_name):
            assert table_name == "source_documents"
            return _DeleteQuery(table_name)

    monkeypatch.setattr("app.api.routes.storage.get_supabase_admin", lambda: _Admin())
    monkeypatch.setattr(
        "app.api.routes.storage.delete_object_if_exists",
        lambda bucket, object_key: object_delete_calls.append((bucket, object_key)),
    )
    monkeypatch.setattr(
        "app.api.routes.storage.record_storage_object_delete",
        lambda **kwargs: metrics.append(kwargs),
    )

    response = await delete_storage_object("obj-1", AuthStub("user-1"))

    assert response.status_code == 204
    assert table_calls == [
        (
            "source_documents",
            {
                "owner_id": "user-1",
                "storage_object_id": "obj-1",
            },
        )
    ]
    assert object_delete_calls == [
        ("unit-bucket", "users/user-1/assets/projects/project-1/sources/src-1/source/guide.md")
    ]
    assert metrics == [
        {
            "result": "ok",
            "storage_kind": "source",
            "actual_bytes": 12,
            "http_status_code": 204,
        }
    ]


@pytest.mark.asyncio
async def test_delete_storage_object_reconciles_pipeline_source_metadata(monkeypatch):
    deleted_object = {
        "storage_object_id": "obj-2",
        "owner_user_id": "user-1",
        "project_id": "project-1",
        "bucket": "unit-bucket",
        "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-2/source/guide.md",
        "byte_size": 18,
        "storage_kind": "source",
        "storage_surface": "pipeline-services",
        "storage_service_slug": "index-builder",
        "source_uid": "src-2",
        "status": "deleted",
    }
    table_calls: list[tuple[str, dict[str, object]]] = []

    class _DeleteQuery:
        def __init__(self, table_name: str):
            self._table_name = table_name
            self._filters: dict[str, object] = {}

        def delete(self):
            return self

        def eq(self, key: str, value: object):
            self._filters[key] = value
            return self

        def execute(self):
            table_calls.append((self._table_name, dict(self._filters)))
            return type("R", (), {"data": [{"ok": True}]})()

    class _Exec:
        data = deleted_object

        def execute(self):
            return self

    class _Admin:
        def rpc(self, function_name, payload):
            assert function_name == "delete_user_storage_object"
            assert payload == {
                "p_user_id": "user-1",
                "p_storage_object_id": "obj-2",
            }
            return _Exec()

        def table(self, table_name):
            assert table_name == "pipeline_sources"
            return _DeleteQuery(table_name)

    monkeypatch.setattr("app.api.routes.storage.get_supabase_admin", lambda: _Admin())
    monkeypatch.setattr("app.api.routes.storage.delete_object_if_exists", lambda *_a, **_k: None)
    monkeypatch.setattr("app.api.routes.storage.record_storage_object_delete", lambda **_kwargs: None)

    response = await delete_storage_object("obj-2", AuthStub("user-1"))

    assert response.status_code == 204
    assert table_calls == [
        (
            "pipeline_sources",
            {
                "owner_id": "user-1",
                "storage_object_id": "obj-2",
            },
        )
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
    assert rpc_calls[0][1]["p_storage_surface"] == "assets"
    assert rpc_calls[0][1]["p_storage_service_slug"] is None


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
    assert rpc_calls[0][1]["p_storage_surface"] == "pipeline-services"
    assert rpc_calls[0][1]["p_storage_service_slug"] == "index-builder"


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
    storage_object_updates: list[dict] = []

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

    class _UpdateQuery:
        def __init__(self):
            self._payload = None
            self._storage_object_id = None

        def update(self, payload):
            self._payload = payload
            return self

        def eq(self, key, value):
            assert key == "storage_object_id"
            self._storage_object_id = value
            return self

        def execute(self):
            storage_object_updates.append(
                {
                    "storage_object_id": self._storage_object_id,
                    "payload": self._payload,
                }
            )
            return self

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

        def table(self, name):
            assert name == "storage_objects"
            return _UpdateQuery()

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
            "object_key": "users/user-1/assets/projects/project-1/sources/abc123/source/outline.pdf",
            "bytes_used": 1234,
            "document_surface": "assets",
            "storage_object_id": "obj-1",
        }
    ]
    assert storage_object_updates == [
        {
            "storage_object_id": "obj-1",
            "payload": {
                "storage_surface": "assets",
                "storage_service_slug": None,
                "doc_title": "Folder/Outline.pdf",
                "source_type": "pdf",
            },
        }
    ]


@pytest.mark.asyncio
async def test_finalize_completed_source_upload_repairs_source_document_bridge(monkeypatch):
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
        "status": "completed",
    }
    existing = {
        "storage_object_id": "obj-1",
        "reservation_id": "res-1",
        "object_key": "users/user-1/assets/projects/project-1/sources/abc123/source/outline.pdf",
        "byte_size": 1234,
        "storage_kind": "source",
    }

    monkeypatch.setattr("app.api.routes.storage.get_supabase_admin", lambda: object())
    monkeypatch.setattr("app.api.routes.storage._fetch_reservation", lambda *_a, **_k: reservation)
    monkeypatch.setattr(
        "app.api.routes.storage._fetch_storage_object_by_reservation",
        lambda *_a, **_k: existing,
    )
    monkeypatch.setattr("app.api.routes.storage.record_storage_upload_complete", lambda **_kwargs: None)
    monkeypatch.setattr(
        "app.api.routes.storage.upsert_source_document_for_storage_object",
        lambda _admin, **kwargs: calls.append(kwargs),
    )

    result = await finalize_upload("res-1", CompleteUploadRequest(actual_bytes=None), AuthStub("user-1"))

    assert result == existing
    assert calls == [
        {
            "owner_id": "user-1",
            "project_id": "project-1",
            "source_uid": "abc123",
            "source_type": "pdf",
            "doc_title": "Folder/Outline.pdf",
            "object_key": "users/user-1/assets/projects/project-1/sources/abc123/source/outline.pdf",
            "bytes_used": 1234,
            "document_surface": "assets",
            "storage_object_id": "obj-1",
        }
    ]


@pytest.mark.asyncio
async def test_finalize_pipeline_services_source_upload_refreshes_pipeline_source_without_source_document_bridge(
    monkeypatch,
):
    bridge_calls: list[dict] = []
    pipeline_source_upserts: list[dict] = []
    storage_object_updates: list[dict] = []

    reservation = {
        "reservation_id": "res-1",
        "owner_user_id": "user-1",
        "project_id": "project-1",
        "bucket": "unit-bucket",
        "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/abc123/source/outline.md",
        "requested_bytes": 1234,
        "content_type": "text/markdown",
        "original_filename": "outline.md",
        "storage_kind": "source",
        "source_uid": "abc123",
        "source_type": "md",
        "doc_title": "Folder/Outline.md",
        "storage_surface": "pipeline-services",
        "storage_service_slug": "index-builder",
        "status": "pending",
    }

    monkeypatch.setattr("app.api.routes.storage._fetch_reservation", lambda *_a, **_k: reservation)
    monkeypatch.setattr("app.api.routes.storage.get_object_size_bytes", lambda *_a, **_k: 1234)
    monkeypatch.setattr("app.api.routes.storage.record_storage_upload_complete", lambda **_kwargs: None)
    monkeypatch.setattr(
        "app.api.routes.storage.upsert_source_document_for_storage_object",
        lambda _admin, **kwargs: bridge_calls.append(kwargs),
    )

    class _TableQuery:
        def __init__(self, name):
            self._name = name
            self._payload = None
            self._storage_object_id = None

        def upsert(self, payload, on_conflict):
            assert self._name == "pipeline_sources"
            pipeline_source_upserts.append(
                {
                    "payload": payload,
                    "on_conflict": on_conflict,
                }
            )
            return self

        def update(self, payload):
            assert self._name == "storage_objects"
            self._payload = payload
            return self

        def eq(self, key, value):
            assert self._name == "storage_objects"
            assert key == "storage_object_id"
            self._storage_object_id = value
            return self

        def execute(self):
            if self._name == "storage_objects":
                storage_object_updates.append(
                    {
                        "storage_object_id": self._storage_object_id,
                        "payload": self._payload,
                    }
                )
            return self

    class _Admin:
        def rpc(self, *_args, **_kwargs):
            class _Exec:
                data = {
                    "storage_object_id": "obj-1",
                    "reservation_id": "res-1",
                    "object_key": reservation["object_key"],
                    "byte_size": 1234,
                    "storage_kind": "source",
                }

                def execute(self):
                    return self

            return _Exec()

        def table(self, name):
            assert name in {"pipeline_sources", "storage_objects"}
            return _TableQuery(name)

    monkeypatch.setattr("app.api.routes.storage.get_supabase_admin", lambda: _Admin())

    result = await finalize_upload(
        "res-1",
        CompleteUploadRequest(actual_bytes=1234),
        AuthStub("user-1"),
    )

    assert result["storage_object_id"] == "obj-1"
    assert bridge_calls == []
    assert pipeline_source_upserts == [
        {
            "payload": {
                "owner_id": "user-1",
                "project_id": "project-1",
                "pipeline_kind": "markdown_index_builder",
                "storage_service_slug": "index-builder",
                "storage_object_id": "obj-1",
                "source_uid": "abc123",
                "doc_title": "Folder/Outline.md",
                "source_type": "md",
                "byte_size": 1234,
                "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/abc123/source/outline.md",
            },
            "on_conflict": "owner_id,project_id,pipeline_kind,source_uid",
        }
    ]
    assert storage_object_updates == [
        {
            "storage_object_id": "obj-1",
            "payload": {
                "storage_surface": "pipeline-services",
                "storage_service_slug": "index-builder",
                "doc_title": "Folder/Outline.md",
                "source_type": "md",
            },
        }
    ]


@pytest.mark.asyncio
async def test_finalize_source_upload_returns_retryable_error_when_bridge_write_fails(monkeypatch):
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
        lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("bridge failed")),
    )

    class _UpdateQuery:
        def update(self, _payload):
            return self

        def eq(self, key, value):
            assert key == "storage_object_id"
            assert value == "obj-1"
            return self

        def execute(self):
            return self

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

        def table(self, name):
            assert name == "storage_objects"
            return _UpdateQuery()

    monkeypatch.setattr("app.api.routes.storage.get_supabase_admin", lambda: _Admin())

    with pytest.raises(HTTPException) as exc:
        await finalize_upload(
            "res-1",
            CompleteUploadRequest(actual_bytes=1234),
            AuthStub("user-1"),
        )

    assert exc.value.status_code == 503
    assert exc.value.detail == "Upload completed but source document finalization failed; retry completion"


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


@pytest.mark.asyncio
async def test_create_upload_returns_structured_conflict_for_active_pending_duplicate(monkeypatch):
    monkeypatch.setattr("app.api.routes.storage.get_settings", lambda: type("S", (), {
        "gcs_user_storage_bucket": "unit-bucket",
        "user_storage_max_file_bytes": 1024,
    })())
    monkeypatch.setattr("app.api.routes.storage._assert_project_ownership", lambda *_a, **_k: None)
    signed_url_calls: list[dict] = []
    monkeypatch.setattr(
        "app.api.routes.storage.create_signed_upload_url",
        lambda **kwargs: signed_url_calls.append(kwargs) or "https://upload.test/unused",
    )

    existing_reservation = {
        "reservation_id": "res-existing",
        "bucket": "unit-bucket",
        "object_key": "users/user-1/assets/projects/project-1/sources/src-1/source/a.txt",
        "requested_bytes": 1,
        "status": "pending",
        "created_at": "2026-03-28T01:00:00+00:00",
        "expires_at": "2999-01-01T00:00:00+00:00",
    }

    class _TableQuery:
        def __init__(self, data):
            self.data = data

        def select(self, *_args, **_kwargs):
            return self

        def eq(self, *_args, **_kwargs):
            return self

        def maybe_single(self):
            return self

        def execute(self):
            return self

    class _Admin:
        def rpc(self, function_name, _payload):
            if function_name == "reserve_user_storage":
                raise RuntimeError("pending reservation already exists for this object")
            raise AssertionError(f"unexpected rpc {function_name}")

        def table(self, table_name):
            assert table_name == "storage_upload_reservations"
            return _TableQuery(existing_reservation)

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

    assert exc.value.status_code == 409
    assert exc.value.detail == {
        "code": "pending_reservation_exists",
        "reservation_id": "res-existing",
        "object_key": "users/user-1/assets/projects/project-1/sources/src-1/source/a.txt",
        "requested_bytes": 1,
        "created_at": "2026-03-28T01:00:00+00:00",
        "expires_at": "2999-01-01T00:00:00+00:00",
    }
    assert signed_url_calls == []


@pytest.mark.asyncio
async def test_create_upload_cancels_expired_duplicate_then_retries(monkeypatch):
    monkeypatch.setattr("app.api.routes.storage.get_settings", lambda: type("S", (), {
        "gcs_user_storage_bucket": "unit-bucket",
        "user_storage_max_file_bytes": 1024,
    })())
    monkeypatch.setattr("app.api.routes.storage._assert_project_ownership", lambda *_a, **_k: None)
    monkeypatch.setattr("app.api.routes.storage.create_signed_upload_url", lambda **_k: "https://upload.test/new")

    existing_reservation = {
        "reservation_id": "res-expired",
        "bucket": "unit-bucket",
        "object_key": "users/user-1/assets/projects/project-1/sources/src-1/source/a.txt",
        "requested_bytes": 1,
        "status": "pending",
        "created_at": "2026-03-28T01:00:00+00:00",
        "expires_at": "2000-01-01T00:00:00+00:00",
    }
    rpc_calls: list[tuple[str, dict]] = []

    class _TableQuery:
        def __init__(self, data):
            self.data = data

        def select(self, *_args, **_kwargs):
            return self

        def eq(self, *_args, **_kwargs):
            return self

        def maybe_single(self):
            return self

        def execute(self):
            return self

    class _Admin:
        def __init__(self):
            self.reserve_attempts = 0

        def rpc(self, function_name, payload):
            rpc_calls.append((function_name, payload))
            if function_name == "reserve_user_storage":
                self.reserve_attempts += 1
                if self.reserve_attempts == 1:
                    raise RuntimeError("pending reservation already exists for this object")

                class _Exec:
                    data = {
                        "reservation_id": "res-new",
                        "bucket": "unit-bucket",
                        "object_key": payload["p_object_key"],
                        "requested_bytes": payload["p_requested_bytes"],
                        "status": "pending",
                    }

                    def execute(self):
                        return self

                return _Exec()

            if function_name == "cancel_user_storage_reservation":
                class _VoidExec:
                    def execute(self):
                        return self

                return _VoidExec()

            raise AssertionError(f"unexpected rpc {function_name}")

        def table(self, table_name):
            assert table_name == "storage_upload_reservations"
            return _TableQuery(existing_reservation)

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

    assert result == {
        "reservation_id": "res-new",
        "bucket": "unit-bucket",
        "object_key": "users/user-1/assets/projects/project-1/sources/src-1/source/a.txt",
        "requested_bytes": 1,
        "status": "pending",
        "signed_upload_url": "https://upload.test/new",
        "expires_in_seconds": 1800,
    }
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
        ),
        (
            "cancel_user_storage_reservation",
            {
                "p_reservation_id": "res-expired",
                "p_owner_user_id": "user-1",
            },
        ),
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
        ),
    ]
