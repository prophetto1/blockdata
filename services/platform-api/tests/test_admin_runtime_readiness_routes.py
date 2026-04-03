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


def test_get_runtime_readiness_requires_superuser(client):
    response = client.get("/admin/runtime/readiness")
    assert response.status_code in (401, 403)


def test_get_runtime_readiness_returns_grouped_snapshot(superuser_client, monkeypatch):
    captured: dict[str, str] = {}
    snapshot = {
        "generated_at": "2026-03-30T16:00:00Z",
        "summary": {"ok": 3, "warn": 1, "fail": 1, "unknown": 0},
        "surfaces": [
            {
                "id": "shared",
                "label": "Shared",
                "summary": {"ok": 2, "warn": 1, "fail": 0, "unknown": 0},
                "checks": [
                    {
                        "id": "shared.platform_api.ready",
                        "category": "process",
                        "status": "ok",
                        "label": "Platform API readiness",
                        "summary": "Platform API process is ready.",
                        "cause": "The process is serving and its runtime identity is available.",
                        "cause_confidence": "high",
                        "depends_on": [],
                        "blocked_by": [],
                        "available_actions": [],
                        "verify_after": [],
                        "next_if_still_failing": [],
                        "actionability": "info_only",
                        "evidence": {"ready": True},
                        "remediation": "No action required.",
                        "checked_at": "2026-03-30T16:00:00Z",
                    }
                ],
            },
            {
                "id": "blockdata",
                "label": "BlockData",
                "summary": {"ok": 1, "warn": 0, "fail": 1, "unknown": 0},
                "checks": [
                    {
                        "id": "blockdata.storage.bucket_cors",
                        "category": "connectivity",
                        "status": "fail",
                        "label": "Bucket CORS",
                        "summary": "Browser upload CORS is not configured.",
                        "cause": "The bucket has no browser-upload CORS rules.",
                        "cause_confidence": "high",
                        "depends_on": [],
                        "blocked_by": [],
                        "available_actions": [
                            {
                                "action_kind": "storage_browser_upload_cors_reconcile",
                                "label": "Reconcile bucket CORS policy",
                                "description": "Apply the checked-in browser upload CORS policy to the user-storage bucket.",
                                "route": "/admin/runtime/storage/browser-upload-cors/reconcile",
                                "requires_confirmation": True,
                            }
                        ],
                        "verify_after": [
                            {
                                "probe_kind": "readiness_check_verify",
                                "label": "Refresh the readiness snapshot",
                                "route": "/admin/runtime/readiness?surface=blockdata",
                            }
                        ],
                        "next_if_still_failing": [
                            {
                                "step_kind": "inspect_dependency",
                                "label": "Inspect the live bucket policy",
                                "description": "Verify the live bucket CORS rules match the checked-in artifact.",
                            }
                        ],
                        "actionability": "backend_action",
                        "evidence": {
                            "cors_configured": False,
                            "bucket_name": "blockdata-user-content-prod",
                            "allowed_origins": [],
                        },
                        "remediation": "Apply bucket CORS rules.",
                        "checked_at": "2026-03-30T16:00:00Z",
                    }
                ],
            },
            {
                "id": "agchain",
                "label": "AGChain",
                "summary": {"ok": 0, "warn": 0, "fail": 0, "unknown": 0},
                "checks": [],
            },
        ],
    }

    def _mock_snapshot(*, surface: str, actor_id: str):
        captured["surface"] = surface
        captured["actor_id"] = actor_id
        return snapshot

    monkeypatch.setattr(
        "app.api.routes.admin_runtime_readiness.get_runtime_readiness_snapshot",
        _mock_snapshot,
    )

    response = superuser_client.get("/admin/runtime/readiness?surface=all")

    assert response.status_code == 200
    body = response.json()
    assert captured["surface"] == "all"
    assert captured["actor_id"] == "admin-user"
    assert body["summary"] == {"ok": 3, "warn": 1, "fail": 1, "unknown": 0}
    assert [surface["id"] for surface in body["surfaces"]] == ["shared", "blockdata", "agchain"]
    assert body["surfaces"][0]["checks"][0]["label"] == "Platform API readiness"
    assert body["surfaces"][0]["checks"][0]["cause_confidence"] == "high"
    assert body["surfaces"][1]["checks"][0]["actionability"] == "backend_action"
    assert body["surfaces"][1]["checks"][0]["available_actions"][0]["action_kind"] == "storage_browser_upload_cors_reconcile"
    assert body["surfaces"][1]["checks"][0]["evidence"]["bucket_name"] == "blockdata-user-content-prod"


def test_get_runtime_readiness_returns_snapshot_when_snapshot_metrics_raise(superuser_client, monkeypatch):
    snapshot = {
        "generated_at": "2026-03-30T16:00:00Z",
        "summary": {"ok": 1, "warn": 0, "fail": 0, "unknown": 0},
        "surfaces": [
            {
                "id": "shared",
                "label": "Shared",
                "summary": {"ok": 1, "warn": 0, "fail": 0, "unknown": 0},
                "checks": [
                    {
                        "id": "shared.platform_api.ready",
                        "category": "process",
                        "status": "ok",
                        "label": "Platform API readiness",
                        "summary": "Platform API process is ready.",
                        "cause": "The process is serving and its runtime identity is available.",
                        "cause_confidence": "high",
                        "depends_on": [],
                        "blocked_by": [],
                        "available_actions": [],
                        "verify_after": [],
                        "next_if_still_failing": [],
                        "actionability": "info_only",
                        "evidence": {"ready": True},
                        "remediation": "No action required.",
                        "checked_at": "2026-03-30T16:00:00Z",
                    }
                ],
            }
        ],
    }

    monkeypatch.setattr(
        "app.api.routes.admin_runtime_readiness.get_runtime_readiness_snapshot",
        lambda **_kwargs: snapshot,
    )
    monkeypatch.setattr(
        "app.api.routes.admin_runtime_readiness.record_runtime_readiness_snapshot",
        lambda **_kwargs: (_ for _ in ()).throw(RuntimeError("snapshot metrics unavailable")),
    )

    response = superuser_client.get("/admin/runtime/readiness?surface=all")

    assert response.status_code == 200
    assert response.json()["summary"] == {"ok": 1, "warn": 0, "fail": 0, "unknown": 0}


def test_get_runtime_readiness_still_returns_backend_500_when_error_metrics_raise(superuser_client, monkeypatch):
    monkeypatch.setattr(
        "app.api.routes.admin_runtime_readiness.get_runtime_readiness_snapshot",
        lambda **_kwargs: (_ for _ in ()).throw(RuntimeError("snapshot exploded")),
    )
    monkeypatch.setattr(
        "app.api.routes.admin_runtime_readiness.record_runtime_readiness_snapshot",
        lambda **_kwargs: (_ for _ in ()).throw(RuntimeError("snapshot metrics unavailable")),
    )

    response = superuser_client.get("/admin/runtime/readiness?surface=all")

    assert response.status_code == 500
    assert response.json() == {"detail": "Failed to build runtime readiness snapshot"}
