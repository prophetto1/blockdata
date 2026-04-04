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
async def test_list_pipeline_sources_reads_pipeline_owned_inventory(monkeypatch):
    from app.api.routes.pipelines import list_pipeline_sources

    captured: list[dict] = []
    monkeypatch.setattr("app.api.routes.pipelines.get_supabase_admin", lambda: object())
    monkeypatch.setattr("app.api.routes.pipelines._assert_project_ownership", lambda *_a, **_k: None)
    monkeypatch.setattr(
        "app.api.routes.pipelines.pipeline_source_library.list_pipeline_sources",
        lambda *_a, **kwargs: captured.append(kwargs)
        or [
            {
                "pipeline_source_id": "psrc-good",
                "source_uid": "src-good",
                "project_id": "project-1",
                "doc_title": "Good",
                "source_type": "md",
                "byte_size": 12,
                "created_at": "2026-03-28T10:00:00Z",
                "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-good/source/good.md",
                "source_origin": "pipeline-services",
            },
        ],
    )

    result = await list_pipeline_sources("markdown_index_builder", "project-1", None, _user_auth())

    assert result == {
        "items": [
            {
                "pipeline_source_id": "psrc-good",
                "source_uid": "src-good",
                "project_id": "project-1",
                "doc_title": "Good",
                "source_type": "md",
                "byte_size": 12,
                "created_at": "2026-03-28T10:00:00Z",
                "source_origin": "pipeline-services",
                "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-good/source/good.md",
            }
        ]
    }
    assert captured == [
        {
            "owner_id": "user-1",
            "project_id": "project-1",
            "pipeline_kind": "markdown_index_builder",
            "search": None,
            "eligible_source_types": ["md", "markdown"],
        }
    ]


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
        "app.api.routes.pipelines._load_owned_source_set",
        lambda *_a, **_k: {
            "source_set_id": "set-1",
            "project_id": "project-1",
            "member_count": 2,
        },
    )
    monkeypatch.setattr("app.api.routes.pipelines._load_active_pipeline_job", lambda *_a, **_k: None)
    monkeypatch.setattr(
        "app.api.routes.pipelines._insert_pipeline_job",
        lambda *_a, **_k: {
            "job_id": "11111111-1111-1111-1111-111111111111",
            "pipeline_kind": "markdown_index_builder",
            "source_set_id": "set-1",
            "status": "queued",
            "stage": "queued",
        },
    )

    result = await create_pipeline_job(
        "markdown_index_builder",
        CreatePipelineJobRequest(source_set_id="set-1"),
        _user_auth(),
    )

    assert result == {
        "job_id": "11111111-1111-1111-1111-111111111111",
        "pipeline_kind": "markdown_index_builder",
        "source_set_id": "set-1",
        "status": "queued",
        "stage": "queued",
    }


@pytest.mark.asyncio
async def test_create_pipeline_source_set_emits_locked_observability(monkeypatch):
    from app.api.routes.pipelines import CreatePipelineSourceSetRequest, create_pipeline_source_set

    metrics: list[dict] = []
    member_counts: list[dict] = []
    logs: list[dict] = []
    captured: list[dict] = []

    monkeypatch.setattr("app.api.routes.pipelines.get_supabase_admin", lambda: object())
    monkeypatch.setattr("app.api.routes.pipelines._assert_project_ownership", lambda *_a, **_k: None)
    monkeypatch.setattr(
        "app.api.routes.pipelines.pipeline_source_sets_service.create_source_set",
        lambda *_a, **kwargs: captured.append(kwargs)
        or {
            "source_set_id": "set-1",
            "project_id": "project-1",
            "label": "Release corpus",
            "member_count": 2,
            "total_bytes": 128,
            "items": [],
        },
    )
    monkeypatch.setattr(
        "app.api.routes.pipelines.record_pipeline_source_set_create",
        lambda **kwargs: metrics.append(dict(kwargs)),
    )
    monkeypatch.setattr(
        "app.api.routes.pipelines.record_pipeline_source_set_member_count",
        lambda **kwargs: member_counts.append(dict(kwargs)),
    )
    monkeypatch.setattr(
        "app.api.routes.pipelines.log_pipeline_source_set_changed",
        lambda **kwargs: logs.append(dict(kwargs)),
    )

    result = await create_pipeline_source_set(
        "markdown_index_builder",
        CreatePipelineSourceSetRequest(
            project_id="project-1",
            label="Release corpus",
            pipeline_source_ids=["psrc-1", "psrc-2"],
        ),
        _user_auth(),
    )

    assert result["source_set"]["source_set_id"] == "set-1"
    assert metrics == [
        {
            "result": "ok",
            "pipeline_kind": "markdown_index_builder",
            "http_status_code": 201,
        }
    ]
    assert member_counts == [
        {
            "pipeline_kind": "markdown_index_builder",
            "member_count": 2,
        }
    ]
    assert logs == [
        {
            "pipeline_kind": "markdown_index_builder",
            "change_kind": "create",
            "member_count": 2,
            "has_project_id": True,
        }
    ]
    assert captured == [
        {
            "owner_id": "user-1",
            "pipeline_kind": "markdown_index_builder",
            "project_id": "project-1",
            "label": "Release corpus",
            "pipeline_source_ids": ["psrc-1", "psrc-2"],
            "eligible_source_types": ["md", "markdown"],
        }
    ]


@pytest.mark.asyncio
async def test_update_pipeline_source_set_emits_locked_observability(monkeypatch):
    from app.api.routes.pipelines import UpdatePipelineSourceSetRequest, update_pipeline_source_set

    metrics: list[dict] = []
    member_counts: list[dict] = []
    logs: list[dict] = []
    captured: list[dict] = []

    monkeypatch.setattr("app.api.routes.pipelines.get_supabase_admin", lambda: object())
    monkeypatch.setattr(
        "app.api.routes.pipelines.pipeline_source_sets_service.update_source_set",
        lambda *_a, **kwargs: captured.append(kwargs)
        or {
            "source_set_id": "set-1",
            "project_id": "project-1",
            "label": "Renamed corpus",
            "member_count": 3,
            "total_bytes": 256,
            "items": [],
        },
    )
    monkeypatch.setattr(
        "app.api.routes.pipelines.record_pipeline_source_set_update",
        lambda **kwargs: metrics.append(dict(kwargs)),
    )
    monkeypatch.setattr(
        "app.api.routes.pipelines.record_pipeline_source_set_member_count",
        lambda **kwargs: member_counts.append(dict(kwargs)),
    )
    monkeypatch.setattr(
        "app.api.routes.pipelines.log_pipeline_source_set_changed",
        lambda **kwargs: logs.append(dict(kwargs)),
    )

    result = await update_pipeline_source_set(
        "markdown_index_builder",
        "set-1",
        UpdatePipelineSourceSetRequest(
            label="Renamed corpus",
            pipeline_source_ids=["psrc-1", "psrc-2", "psrc-3"],
        ),
        _user_auth(),
    )

    assert result["source_set"]["source_set_id"] == "set-1"
    assert metrics == [
        {
            "result": "ok",
            "pipeline_kind": "markdown_index_builder",
            "http_status_code": 200,
        }
    ]
    assert member_counts == [
        {
            "pipeline_kind": "markdown_index_builder",
            "member_count": 3,
        }
    ]
    assert logs == [
        {
            "pipeline_kind": "markdown_index_builder",
            "change_kind": "update",
            "member_count": 3,
            "has_project_id": True,
        }
    ]
    assert captured == [
        {
            "owner_id": "user-1",
            "pipeline_kind": "markdown_index_builder",
            "source_set_id": "set-1",
            "label": "Renamed corpus",
            "pipeline_source_ids": ["psrc-1", "psrc-2", "psrc-3"],
            "eligible_source_types": ["md", "markdown"],
        }
    ]


def test_insert_pipeline_job_records_first_pipeline_source_id():
    from app.api.routes.pipelines import _insert_pipeline_job

    inserts: list[dict] = []

    class _InsertQuery:
        def insert(self, payload):
            inserts.append(payload)
            return self

        def execute(self):
            self.data = [dict(inserts[-1], job_id="job-1")]
            return self

    class _Admin:
        def table(self, name):
            assert name == "pipeline_jobs"
            return _InsertQuery()

    result = _insert_pipeline_job(
        _Admin(),
        owner_id="user-1",
        pipeline_kind="markdown_index_builder",
        source_set={
            "source_set_id": "set-1",
            "project_id": "project-1",
            "items": [
                {
                    "pipeline_source_id": "psrc-1",
                    "source_uid": "src-1",
                }
            ],
        },
    )

    assert result["job_id"] == "job-1"
    assert inserts == [
        {
            "pipeline_kind": "markdown_index_builder",
            "owner_id": "user-1",
            "project_id": "project-1",
            "pipeline_source_id": "psrc-1",
            "source_uid": "src-1",
            "source_set_id": "set-1",
            "status": "queued",
            "stage": "queued",
        }
    ]


@pytest.mark.asyncio
async def test_create_pipeline_job_rejects_unimplemented_pipeline(monkeypatch):
    from app.api.routes.pipelines import CreatePipelineJobRequest, create_pipeline_job

    monkeypatch.setattr("app.api.routes.pipelines.get_supabase_admin", lambda: object())
    monkeypatch.setattr("app.api.routes.pipelines.get_pipeline_worker_definition", lambda *_a, **_k: None)

    with pytest.raises(HTTPException) as exc:
        await create_pipeline_job(
            "markdown_index_builder",
            CreatePipelineJobRequest(source_set_id="set-1"),
            _user_auth(),
        )

    assert exc.value.status_code == 503
    assert exc.value.detail == "Pipeline kind is not executable yet"


@pytest.mark.asyncio
async def test_get_latest_pipeline_job_reads_by_source_set(monkeypatch):
    from app.api.routes.pipelines import get_latest_pipeline_job

    monkeypatch.setattr("app.api.routes.pipelines.get_supabase_admin", lambda: object())
    monkeypatch.setattr(
        "app.api.routes.pipelines._load_owned_source_set",
        lambda *_a, **_k: {
            "source_set_id": "set-1",
            "project_id": "project-1",
            "member_count": 2,
        },
    )
    monkeypatch.setattr(
        "app.api.routes.pipelines._load_latest_job",
        lambda *_a, **_k: {
            "job_id": "job-1",
            "pipeline_kind": "markdown_index_builder",
            "source_uid": "src-1",
            "source_set_id": "set-1",
            "status": "running",
            "stage": "embedding",
        },
    )
    monkeypatch.setattr("app.api.routes.pipelines._load_deliverables_for_job", lambda *_a, **_k: [])

    result = await get_latest_pipeline_job("markdown_index_builder", "set-1", _user_auth())

    assert result == {
        "job": {
            "job_id": "job-1",
            "pipeline_kind": "markdown_index_builder",
            "source_uid": "src-1",
            "source_set_id": "set-1",
            "status": "running",
            "stage": "embedding",
            "failure_stage": None,
            "error_message": None,
            "section_count": None,
            "chunk_count": None,
            "embedding_provider": None,
            "embedding_model": None,
            "created_at": None,
            "started_at": None,
            "claimed_at": None,
            "heartbeat_at": None,
            "completed_at": None,
            "deliverables": [],
        }
    }


@pytest.mark.asyncio
async def test_get_latest_pipeline_job_returns_none_when_backend_has_no_rows(monkeypatch):
    from app.api.routes.pipelines import get_latest_pipeline_job

    class _LatestQuery:
        def select(self, *_a, **_k):
            return self

        def eq(self, *_a, **_k):
            return self

        def order(self, *_a, **_k):
            return self

        def limit(self, *_a, **_k):
            return self

        def maybe_single(self):
            return self

        def execute(self):
            return None

    class _Admin:
        def table(self, name):
            assert name == "pipeline_jobs"
            return _LatestQuery()

    monkeypatch.setattr("app.api.routes.pipelines.get_supabase_admin", lambda: _Admin())
    monkeypatch.setattr(
        "app.api.routes.pipelines._load_owned_source_set",
        lambda *_a, **_k: {
            "source_set_id": "set-1",
            "project_id": "project-1",
            "member_count": 2,
        },
    )

    result = await get_latest_pipeline_job("markdown_index_builder", "set-1", _user_auth())

    assert result == {"job": None}


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
