from __future__ import annotations

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal


def _user_auth() -> AuthPrincipal:
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated"}),
        auth_source="test",
    )


@pytest.mark.asyncio
async def test_list_pipeline_definitions_returns_index_builder_item():
    from app.api.routes.pipelines import list_pipeline_definitions

    result = await list_pipeline_definitions(_user_auth())

    assert result == {
        "items": [
            {
                "pipeline_kind": "markdown_index_builder",
                "label": "Index Builder",
                "supports_manual_trigger": True,
                "eligible_source_types": ["md", "markdown"],
                "deliverable_kinds": ["lexical_sqlite", "semantic_zip"],
            }
        ]
    }


@pytest.mark.asyncio
async def test_list_pipeline_sources_filters_to_service_prefix_and_markdown(monkeypatch):
    from app.api.routes.pipelines import list_pipeline_sources

    monkeypatch.setattr("app.api.routes.pipelines.get_supabase_admin", lambda: object())
    monkeypatch.setattr("app.api.routes.pipelines._assert_project_ownership", lambda *_a, **_k: None)
    monkeypatch.setattr(
        "app.api.routes.pipelines._query_project_sources",
        lambda *_a, **_k: [
            {
                "source_uid": "src-good",
                "project_id": "project-1",
                "doc_title": "Good",
                "source_type": "md",
                "content_type": "text/markdown",
                "byte_size": 12,
                "created_at": "2026-03-28T10:00:00Z",
                "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-good/source/good.md",
            },
            {
                "source_uid": "src-assets",
                "project_id": "project-1",
                "doc_title": "Assets",
                "source_type": "md",
                "content_type": "text/markdown",
                "byte_size": 10,
                "created_at": "2026-03-28T11:00:00Z",
                "object_key": "users/user-1/assets/projects/project-1/sources/src-assets/source/assets.md",
            },
            {
                "source_uid": "src-pdf",
                "project_id": "project-1",
                "doc_title": "PDF",
                "source_type": "pdf",
                "content_type": "application/pdf",
                "byte_size": 99,
                "created_at": "2026-03-28T12:00:00Z",
                "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-pdf/source/doc.pdf",
            },
        ],
    )

    result = await list_pipeline_sources("markdown_index_builder", "project-1", None, _user_auth())

    assert result == {
        "items": [
            {
                "source_uid": "src-good",
                "project_id": "project-1",
                "doc_title": "Good",
                "source_type": "md",
                "content_type": "text/markdown",
                "byte_size": 12,
                "created_at": "2026-03-28T10:00:00Z",
            }
        ]
    }


@pytest.mark.asyncio
async def test_create_pipeline_job_returns_queued_shape(monkeypatch):
    from app.api.routes.pipelines import CreatePipelineJobRequest, create_pipeline_job

    monkeypatch.setattr("app.api.routes.pipelines.get_supabase_admin", lambda: object())
    monkeypatch.setattr(
        "app.api.routes.pipelines.get_pipeline_worker_definition",
        lambda pipeline_kind: {
            "pipeline_kind": pipeline_kind,
            "handler_module": "app.pipelines.markdown_index_builder",
            "handler_name": "run_markdown_index_builder",
        },
    )
    monkeypatch.setattr(
        "app.api.routes.pipelines._load_owned_source",
        lambda *_a, **_k: {"source_uid": "src-1", "source_type": "md"},
    )
    monkeypatch.setattr("app.api.routes.pipelines._load_active_pipeline_job", lambda *_a, **_k: None)
    monkeypatch.setattr(
        "app.api.routes.pipelines._insert_pipeline_job",
        lambda *_a, **_k: {
            "job_id": "11111111-1111-1111-1111-111111111111",
            "pipeline_kind": "markdown_index_builder",
            "source_uid": "src-1",
            "status": "queued",
            "stage": "queued",
        },
    )

    result = await create_pipeline_job(
        "markdown_index_builder",
        CreatePipelineJobRequest(source_uid="src-1"),
        _user_auth(),
    )

    assert result == {
        "job_id": "11111111-1111-1111-1111-111111111111",
        "pipeline_kind": "markdown_index_builder",
        "source_uid": "src-1",
        "status": "queued",
        "stage": "queued",
    }


@pytest.mark.asyncio
async def test_create_pipeline_job_rejects_unimplemented_pipeline(monkeypatch):
    from app.api.routes.pipelines import CreatePipelineJobRequest, create_pipeline_job

    monkeypatch.setattr("app.api.routes.pipelines.get_supabase_admin", lambda: object())
    monkeypatch.setattr("app.api.routes.pipelines.get_pipeline_worker_definition", lambda *_a, **_k: None)

    with pytest.raises(HTTPException) as exc:
        await create_pipeline_job(
            "markdown_index_builder",
            CreatePipelineJobRequest(source_uid="src-1"),
            _user_auth(),
        )

    assert exc.value.status_code == 503
    assert exc.value.detail == "Pipeline kind is not executable yet"


@pytest.mark.asyncio
async def test_get_pipeline_job_rejects_unowned_job(monkeypatch):
    from app.api.routes.pipelines import get_pipeline_job

    monkeypatch.setattr("app.api.routes.pipelines.get_supabase_admin", lambda: object())
    monkeypatch.setattr("app.api.routes.pipelines._load_owned_job", lambda *_a, **_k: None)

    with pytest.raises(HTTPException) as exc:
        await get_pipeline_job("11111111-1111-1111-1111-111111111111", _user_auth())

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_download_pipeline_deliverable_returns_attachment_headers(monkeypatch):
    from app.api.routes.pipelines import download_pipeline_deliverable

    monkeypatch.setattr("app.api.routes.pipelines.get_supabase_admin", lambda: object())
    monkeypatch.setattr(
        "app.api.routes.pipelines._load_owned_job",
        lambda *_a, **_k: {"job_id": "job-1", "pipeline_kind": "markdown_index_builder"},
    )
    monkeypatch.setattr(
        "app.api.routes.pipelines._load_deliverable_download_record",
        lambda *_a, **_k: {
            "deliverable_kind": "lexical_sqlite",
            "filename": "asset.lexical.sqlite",
            "content_type": "application/vnd.sqlite3",
            "bucket": "unit-bucket",
            "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-1/jobs/job-1/asset.lexical.sqlite",
        },
    )
    monkeypatch.setattr("app.api.routes.pipelines._download_storage_bytes", lambda *_a, **_k: b"sqlite")

    response = await download_pipeline_deliverable("job-1", "lexical_sqlite", _user_auth())

    assert response.body == b"sqlite"
    assert response.headers["content-type"] == "application/vnd.sqlite3"
    assert "attachment; filename=asset.lexical.sqlite" in response.headers["content-disposition"]


def test_pipelines_router_is_mounted(monkeypatch):
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")

    from app.core.config import get_settings

    get_settings.cache_clear()

    from app.main import create_app

    app = create_app()
    app.dependency_overrides[require_user_auth] = _user_auth

    with TestClient(app) as client:
        response = client.get("/pipelines/definitions")

    get_settings.cache_clear()

    assert response.status_code == 200
