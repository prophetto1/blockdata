from __future__ import annotations

from fastapi.testclient import TestClient
import pytest

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


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")

    from app.core.config import get_settings

    get_settings.cache_clear()
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
    get_settings.cache_clear()


@pytest.fixture
def superuser_client(monkeypatch):
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")

    from app.core.config import get_settings

    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[require_superuser] = _superuser_principal
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    get_settings.cache_clear()


def test_get_storage_policy_requires_superuser(client):
    response = client.get("/admin/storage/policy")
    assert response.status_code in (401, 403)


def test_get_storage_policy_returns_current_value(superuser_client, monkeypatch):
    recorded: list[dict] = []

    monkeypatch.setattr(
        "app.api.routes.admin_storage.load_default_new_user_quota_bytes",
        lambda *_args, **_kwargs: {
            "default_new_user_quota_bytes": 5368709120,
            "updated_at": "2026-03-21T18:25:00Z",
            "updated_by": "admin-user",
        },
    )
    monkeypatch.setattr(
        "app.api.routes.admin_storage.record_admin_storage_policy_read",
        lambda **kwargs: recorded.append(kwargs),
    )

    response = superuser_client.get("/admin/storage/policy")

    assert response.status_code == 200
    assert response.json()["default_new_user_quota_bytes"] == 5368709120
    assert recorded
    assert recorded[0]["result"] == "ok"


def test_patch_storage_policy_updates_value(superuser_client, monkeypatch):
    recorded: list[dict] = []

    monkeypatch.setattr(
        "app.api.routes.admin_storage.update_default_new_user_quota_bytes",
        lambda *_args, **_kwargs: {
            "default_new_user_quota_bytes": 5368709120,
            "updated_at": "2026-03-21T18:25:00Z",
            "updated_by": "admin-user",
        },
    )
    monkeypatch.setattr(
        "app.api.routes.admin_storage.record_admin_storage_policy_update",
        lambda **kwargs: recorded.append(kwargs),
    )

    response = superuser_client.patch(
        "/admin/storage/policy",
        json={
            "default_new_user_quota_bytes": 5368709120,
            "reason": "Set free-tier signup quota to 5 GB for verification",
        },
    )

    assert response.status_code == 200
    assert response.json()["default_new_user_quota_bytes"] == 5368709120
    assert recorded
    assert recorded[0]["result"] == "ok"


def test_get_recent_storage_provisioning_returns_rows(superuser_client, monkeypatch):
    recorded: list[dict] = []

    monkeypatch.setattr(
        "app.api.routes.admin_storage.load_recent_signup_provisioning",
        lambda *_args, **_kwargs: {
            "items": [
                {
                    "user_id": "user-1",
                    "email": "new-user@example.com",
                    "created_at": "2026-03-21T18:20:00Z",
                    "has_auth_user": True,
                    "has_default_project": True,
                    "default_project_id": "project-1",
                    "has_storage_quota": True,
                    "quota_bytes": 5368709120,
                    "used_bytes": 0,
                    "reserved_bytes": 0,
                    "status": "ok",
                }
            ]
        },
    )
    monkeypatch.setattr(
        "app.api.routes.admin_storage.record_admin_storage_provisioning_recent",
        lambda **kwargs: recorded.append(kwargs),
    )

    response = superuser_client.get("/admin/storage/provisioning/recent?limit=25")

    assert response.status_code == 200
    assert response.json()["items"][0]["status"] == "ok"
    assert recorded
    assert recorded[0]["result"] == "ok"
