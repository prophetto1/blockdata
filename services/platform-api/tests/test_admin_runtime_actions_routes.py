from __future__ import annotations

from fastapi.testclient import TestClient
import pytest
from unittest.mock import MagicMock

from app.auth.dependencies import require_superuser
from app.auth.principals import AuthPrincipal
from app.main import create_app


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
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    get_settings.cache_clear()


def test_get_runtime_probe_run_requires_superuser(client):
    response = client.get("/admin/runtime/probe-runs/probe-run-1")

    assert response.status_code in (401, 403)


def test_get_runtime_probe_run_returns_persisted_row(superuser_client, monkeypatch):
    payload = {
        "probe_run_id": "probe-run-1",
        "probe_kind": "readiness_check_verify",
        "check_id": "blockdata.storage.bucket_cors",
        "result": "fail",
        "duration_ms": 4.2,
        "evidence": {"status": "fail"},
        "failure_reason": "Bucket browser-upload CORS rules are missing or incomplete.",
        "created_at": "2026-04-08T16:30:00Z",
    }

    monkeypatch.setattr(
        "app.api.routes.admin_runtime_actions.load_runtime_probe_run",
        lambda **_kwargs: payload,
        raising=False,
    )

    response = superuser_client.get("/admin/runtime/probe-runs/probe-run-1")

    assert response.status_code == 200
    assert response.json() == payload


def test_get_runtime_action_run_requires_superuser(client):
    response = client.get("/admin/runtime/action-runs/action-run-1")

    assert response.status_code in (401, 403)


def test_get_runtime_action_run_returns_persisted_row(superuser_client, monkeypatch):
    payload = {
        "action_run_id": "action-run-1",
        "action_kind": "storage_browser_upload_cors_reconcile",
        "check_id": "blockdata.storage.bucket_cors",
        "result": "ok",
        "duration_ms": 12.8,
        "request": {"confirmed": True},
        "result_payload": {"bucket_name": "blockdata-user-content-dev"},
        "failure_reason": None,
        "created_at": "2026-04-08T16:35:00Z",
    }

    monkeypatch.setattr(
        "app.api.routes.admin_runtime_actions.load_runtime_action_run",
        lambda **_kwargs: payload,
        raising=False,
    )

    response = superuser_client.get("/admin/runtime/action-runs/action-run-1")

    assert response.status_code == 200
    assert response.json() == payload
