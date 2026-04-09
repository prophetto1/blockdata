from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import require_superuser
from app.auth.principals import AuthPrincipal
from app.main import create_app
from app.services.coordination.contracts import disabled_error_payload


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
    def __init__(self, *, disabled: bool = False) -> None:
        self.disabled = disabled

    async def get_status(self):
        if self.disabled:
            from app.services.coordination.contracts import CoordinationRuntimeDisabledError

            raise CoordinationRuntimeDisabledError("disabled")
        return {
            "broker": {"state": "available"},
            "streams": {"COORD_EVENTS": {"messages": 3}},
            "kv_buckets": {"COORD_AGENT_PRESENCE": {"active_keys": 2}},
            "presence_summary": {"active_agents": 2},
            "local_host_outbox_backlog": {"files": 0, "events": 0, "bytes": 0},
            "app_runtime": {"runtime_enabled": True, "host": "JON", "runtime_root": "E:/tmp"},
            "stream_bridge": {"state": "connected", "client_count": 1, "last_error": None},
        }

    async def get_task_snapshot(self, *, task_id: str, limit: int = 25):
        _ = limit
        if self.disabled:
            from app.services.coordination.contracts import CoordinationRuntimeDisabledError

            raise CoordinationRuntimeDisabledError("disabled")
        return {
            "task": {"task_id": task_id, "state": "open"},
            "claim": {"task_id": task_id, "claimed_by": "buddy"},
            "participants": [{"agent_id": "buddy"}],
            "recent_events": [{"task_id": task_id, "event_kind": "created"}],
            "local_host_audit_file": "E:/tmp/coordination-audit/platform-api/2026-04-09.ndjson",
        }

    async def publish_probe_task_event(self, *, task_id: str, event_kind: str, note: str | None, actor_id: str):
        _ = actor_id
        if self.disabled:
            from app.services.coordination.contracts import CoordinationRuntimeDisabledError

            raise CoordinationRuntimeDisabledError("disabled")
        return {
            "event_id": f"{task_id}-{event_kind}",
            "subject": f"coord.tasks.{task_id}.event.{event_kind}",
            "buffered": note == "buffer",
            "stream_name": "COORD_EVENTS",
            "duplicate_window_hours": 24,
        }


class _FakeStreamService:
    def __init__(self, *, enabled: bool = True) -> None:
        self.enabled = enabled

    async def start(self) -> None:
        return None

    async def close(self) -> None:
        return None

    async def stream(self, *, task_id: str | None = None, subject_prefix: str | None = None, limit: int = 50):
        _ = (task_id, subject_prefix, limit)
        yield 'data: {"type":"control","state":"connected"}\n\n'
        yield 'data: {"event_id":"evt-1","task_id":"task-1","event_kind":"created"}\n\n'


@pytest.fixture
def client(monkeypatch):
    from app.core.config import get_settings

    app = _make_app(monkeypatch)
    with TestClient(app) as test_client:
        yield test_client
    get_settings.cache_clear()


@pytest.fixture
def superuser_client(monkeypatch):
    from app.core.config import get_settings

    app = _make_app(monkeypatch)
    app.dependency_overrides[require_superuser] = _superuser_principal
    app.state.coordination_status_service = _FakeStatusService()
    app.state.coordination_event_stream_service = _FakeStreamService()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    get_settings.cache_clear()


def test_get_coordination_status_requires_superuser(client):
    response = client.get("/admin/runtime/coordination/status")
    assert response.status_code in (401, 403)


def test_get_coordination_status_returns_locked_shape(superuser_client):
    response = superuser_client.get("/admin/runtime/coordination/status")

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {
        "broker",
        "streams",
        "kv_buckets",
        "presence_summary",
        "local_host_outbox_backlog",
        "app_runtime",
        "stream_bridge",
    }
    assert body["broker"]["state"] == "available"
    assert body["stream_bridge"]["state"] == "connected"


def test_get_coordination_task_snapshot_returns_locked_shape(superuser_client):
    response = superuser_client.get("/admin/runtime/coordination/tasks/task-7?limit=5")

    assert response.status_code == 200
    body = response.json()
    assert body["task"]["task_id"] == "task-7"
    assert body["claim"]["claimed_by"] == "buddy"
    assert body["recent_events"] == [{"task_id": "task-7", "event_kind": "created"}]


def test_get_coordination_event_stream_returns_sse(superuser_client):
    with superuser_client.stream("GET", "/admin/runtime/coordination/events/stream?task_id=task-1") as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        chunks = [line for line in response.iter_lines() if line]

    assert chunks[0] == 'data: {"type":"control","state":"connected"}'
    assert chunks[1] == 'data: {"event_id":"evt-1","task_id":"task-1","event_kind":"created"}'


def test_get_coordination_event_stream_returns_disabled_503(monkeypatch):
    from app.core.config import get_settings

    app = _make_app(monkeypatch)
    app.dependency_overrides[require_superuser] = _superuser_principal
    app.state.coordination_status_service = _FakeStatusService(disabled=True)
    app.state.coordination_event_stream_service = _FakeStreamService(enabled=False)

    with TestClient(app) as client:
        response = client.get("/admin/runtime/coordination/events/stream")

    assert response.status_code == 503
    assert response.json() == {"detail": disabled_error_payload()}
    app.dependency_overrides.clear()
    get_settings.cache_clear()


def test_post_coordination_probe_returns_202_when_buffered(superuser_client):
    response = superuser_client.post(
        "/admin/runtime/coordination/probes/task-event",
        json={"task_id": "task-3", "event_kind": "claimed", "note": "buffer"},
    )

    assert response.status_code == 202
    body = response.json()
    assert body["buffered"] is True
    assert body["stream_name"] == "COORD_EVENTS"
