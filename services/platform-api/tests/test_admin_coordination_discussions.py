from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import require_superuser
from app.auth.principals import AuthPrincipal
from app.main import create_app
from app.services.coordination.contracts import (
    CoordinationRuntimeDisabledError,
    CoordinationUnavailableError,
    disabled_error_payload,
)


def _superuser_principal() -> AuthPrincipal:
    return AuthPrincipal(
        subject_type="user",
        subject_id="admin-user",
        roles=frozenset({"authenticated", "platform_admin"}),
        auth_source="test",
        email="admin@example.com",
    )


def _make_app(monkeypatch):
    from app.core.config import get_settings
    import app.main as main_module

    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")

    get_settings.cache_clear()
    monkeypatch.setattr(
        main_module,
        "init_pool",
        lambda: MagicMock(status=lambda: {"max_workers": 0, "max_queue_depth": 0, "active": 0, "saturated": False}),
    )
    monkeypatch.setattr(main_module, "shutdown_pool", lambda: None)
    monkeypatch.setattr(main_module, "start_pipeline_jobs_worker", lambda: None)
    monkeypatch.setattr(main_module, "stop_pipeline_jobs_worker", lambda: None)
    monkeypatch.setattr(main_module, "start_storage_cleanup_worker", lambda: None)
    monkeypatch.setattr(main_module, "stop_storage_cleanup_worker", lambda: None)
    return create_app()


class _FakeStatusService:
    def __init__(self, *, error: Exception | None = None) -> None:
        self.error = error
        self.calls: list[dict] = []

    async def get_discussions(
        self,
        *,
        task_id: str | None,
        workspace_path: str | None,
        status: str,
        limit: int,
    ):
        self.calls.append(
            {
                "task_id": task_id,
                "workspace_path": workspace_path,
                "status": status,
                "limit": limit,
            }
        )
        if self.error:
            raise self.error

        return {
            "summary": {
                "thread_count": 1,
                "pending_count": 1,
                "stale_count": 0,
                "workspace_bound_count": 1,
            },
            "discussions": [
                {
                    "task_id": "task-1",
                    "workspace_type": "research",
                    "workspace_path": "E:/writing-system/_collaborate/research/topic",
                    "directional_doc": "E:/writing-system/_collaborate/research/topic/plan.md",
                    "participants": [{"host": "JON", "agent_id": "cdx"}],
                    "pending_recipients": [{"host": "JON", "agent_id": "cdx2"}],
                    "last_event_kind": "response_requested",
                    "status": "pending",
                    "updated_at": "2026-04-11T12:00:00Z",
                }
            ],
        }


@pytest.fixture
def superuser_app(monkeypatch):
    from app.core.config import get_settings

    app = _make_app(monkeypatch)
    app.dependency_overrides[require_superuser] = _superuser_principal
    yield app
    app.dependency_overrides.clear()
    get_settings.cache_clear()


def test_get_coordination_discussions_returns_locked_shape(superuser_app):
    service = _FakeStatusService()
    superuser_app.state.coordination_status_service = service

    with TestClient(superuser_app) as client:
        response = client.get(
            "/admin/runtime/coordination/discussions"
            "?task_id=task-1"
            "&workspace_path=E:/writing-system/_collaborate/research/topic"
            "&status=pending"
            "&limit=10"
        )

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"summary", "discussions"}
    assert body["summary"] == {
        "thread_count": 1,
        "pending_count": 1,
        "stale_count": 0,
        "workspace_bound_count": 1,
    }
    assert body["discussions"][0] == {
        "task_id": "task-1",
        "workspace_type": "research",
        "workspace_path": "E:/writing-system/_collaborate/research/topic",
        "directional_doc": "E:/writing-system/_collaborate/research/topic/plan.md",
        "participants": [{"host": "JON", "agent_id": "cdx"}],
        "pending_recipients": [{"host": "JON", "agent_id": "cdx2"}],
        "last_event_kind": "response_requested",
        "status": "pending",
        "updated_at": "2026-04-11T12:00:00Z",
    }
    assert service.calls == [
        {
            "task_id": "task-1",
            "workspace_path": "E:/writing-system/_collaborate/research/topic",
            "status": "pending",
            "limit": 10,
        }
    ]


def test_get_coordination_discussions_returns_disabled_503(superuser_app):
    superuser_app.state.coordination_status_service = _FakeStatusService(
        error=CoordinationRuntimeDisabledError("disabled")
    )

    with TestClient(superuser_app) as client:
        response = client.get("/admin/runtime/coordination/discussions")

    assert response.status_code == 503
    assert response.json() == {"detail": disabled_error_payload()}


def test_get_coordination_discussions_returns_unavailable_503(superuser_app):
    superuser_app.state.coordination_status_service = _FakeStatusService(
        error=CoordinationUnavailableError("broker unavailable")
    )

    with TestClient(superuser_app) as client:
        response = client.get("/admin/runtime/coordination/discussions")

    assert response.status_code == 503
    assert response.json() == {
        "detail": {
            "code": "coordination_unavailable",
            "message": "broker unavailable",
        }
    }
