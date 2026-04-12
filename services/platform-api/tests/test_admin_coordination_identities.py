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

    async def get_identities(self, *, host: str | None, family: str | None, include_stale: bool):
        self.calls.append(
            {
                "host": host,
                "family": family,
                "include_stale": include_stale,
            }
        )
        if self.error:
            raise self.error

        return {
            "summary": {
                "active_count": 1,
                "stale_count": 1,
                "host_count": 1,
                "family_counts": {"cdx": 2},
                "session_classification_counts": {
                    "vscode.cc.cli": 0,
                    "vscode.cdx.cli": 1,
                    "vscode.cc.ide-panel": 0,
                    "vscode.cdx.ide-panel": 0,
                    "claude-desktop.cc": 0,
                    "codex-app-win.cdx": 0,
                    "terminal.cc": 0,
                    "terminal.cdx": 0,
                    "unknown": 0,
                },
                "session_classification_unknown_count": 0,
                "session_classification_provenance_counts": {
                    "launch_stamped": 1,
                    "runtime_observed": 0,
                    "configured": 0,
                    "inferred": 0,
                    "unknown": 0,
                },
            },
            "identities": [
                {
                    "lease_identity": "cdx",
                    "identity": "cdx",
                    "host": "JON",
                    "family": "cdx",
                    "session_agent_id": "jon-runtime",
                    "claimed_at": "2026-04-11T12:00:00Z",
                    "last_heartbeat_at": "2026-04-11T12:01:00Z",
                    "expires_at": "2026-04-11T12:03:00Z",
                    "stale": False,
                    "revision": 4,
                    "session_classification": {
                        "key": "vscode.cdx.cli",
                        "display_label": "VS Code | CDX CLI",
                        "container_host": "vscode",
                        "interaction_surface": "cli",
                        "runtime_product": "cdx",
                        "classified": True,
                        "registry_version": 1,
                        "reason": None,
                        "provenance": {
                            "key": "launch_stamped",
                            "container_host": "launch_stamped",
                            "interaction_surface": "launch_stamped",
                            "runtime_product": "launch_stamped",
                            "display_label": "derived",
                        },
                    },
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


def test_get_coordination_identities_returns_locked_shape(superuser_app):
    service = _FakeStatusService()
    superuser_app.state.coordination_status_service = service

    with TestClient(superuser_app) as client:
        response = client.get(
            "/admin/runtime/coordination/identities?host=JON&family=cdx&include_stale=true"
        )

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"summary", "identities"}
    assert body["summary"] == {
        "active_count": 1,
        "stale_count": 1,
        "host_count": 1,
        "family_counts": {"cdx": 2},
        "session_classification_counts": {
            "vscode.cc.cli": 0,
            "vscode.cdx.cli": 1,
            "vscode.cc.ide-panel": 0,
            "vscode.cdx.ide-panel": 0,
            "claude-desktop.cc": 0,
            "codex-app-win.cdx": 0,
            "terminal.cc": 0,
            "terminal.cdx": 0,
            "unknown": 0,
        },
        "session_classification_unknown_count": 0,
        "session_classification_provenance_counts": {
            "launch_stamped": 1,
            "runtime_observed": 0,
            "configured": 0,
            "inferred": 0,
            "unknown": 0,
        },
    }
    assert body["identities"][0] == {
        "lease_identity": "cdx",
        "identity": "cdx",
        "host": "JON",
        "family": "cdx",
        "session_agent_id": "jon-runtime",
        "claimed_at": "2026-04-11T12:00:00Z",
        "last_heartbeat_at": "2026-04-11T12:01:00Z",
        "expires_at": "2026-04-11T12:03:00Z",
        "stale": False,
        "revision": 4,
        "session_classification": {
            "key": "vscode.cdx.cli",
            "display_label": "VS Code | CDX CLI",
            "container_host": "vscode",
            "interaction_surface": "cli",
            "runtime_product": "cdx",
            "classified": True,
            "registry_version": 1,
            "reason": None,
            "provenance": {
                "key": "launch_stamped",
                "container_host": "launch_stamped",
                "interaction_surface": "launch_stamped",
                "runtime_product": "launch_stamped",
                "display_label": "derived",
            },
        },
    }
    assert service.calls == [
        {
            "host": "JON",
            "family": "cdx",
            "include_stale": True,
        }
    ]


def test_get_coordination_identities_returns_disabled_503(superuser_app):
    superuser_app.state.coordination_status_service = _FakeStatusService(
        error=CoordinationRuntimeDisabledError("disabled")
    )

    with TestClient(superuser_app) as client:
        response = client.get("/admin/runtime/coordination/identities")

    assert response.status_code == 503
    assert response.json() == {"detail": disabled_error_payload()}


def test_get_coordination_identities_returns_unavailable_503(superuser_app):
    superuser_app.state.coordination_status_service = _FakeStatusService(
        error=CoordinationUnavailableError("broker unavailable")
    )

    with TestClient(superuser_app) as client:
        response = client.get("/admin/runtime/coordination/identities")

    assert response.status_code == 503
    assert response.json() == {
        "detail": {
            "code": "coordination_unavailable",
            "message": "broker unavailable",
        }
    }
