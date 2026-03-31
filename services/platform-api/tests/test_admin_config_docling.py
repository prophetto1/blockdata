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


def test_get_docling_config_requires_superuser(client):
    response = client.get("/admin/config/docling")
    assert response.status_code in (401, 403)


def test_get_docling_config_returns_default(superuser_client, monkeypatch):
    recorded: list[dict] = []

    monkeypatch.setattr(
        "app.api.routes.admin_config_docling._read_docling_blocks_mode",
        lambda *_args, **_kwargs: {"docling_blocks_mode": "raw_docling"},
    )
    monkeypatch.setattr(
        "app.api.routes.admin_config_docling.record_admin_config_docling_read",
        lambda **kwargs: recorded.append(kwargs),
    )

    response = superuser_client.get("/admin/config/docling")

    assert response.status_code == 200
    assert response.json()["docling_blocks_mode"] == "raw_docling"
    assert recorded
    assert recorded[0]["result"] == "ok"


def test_patch_docling_config_updates_value(superuser_client, monkeypatch):
    recorded: list[dict] = []

    monkeypatch.setattr(
        "app.api.routes.admin_config_docling._update_docling_blocks_mode",
        lambda *_args, **_kwargs: {
            "docling_blocks_mode": "raw_docling",
            "updated_at": "2026-03-30T12:00:00Z",
            "updated_by": "admin-user",
        },
    )
    monkeypatch.setattr(
        "app.api.routes.admin_config_docling.record_admin_config_docling_update",
        lambda **kwargs: recorded.append(kwargs),
    )

    response = superuser_client.patch(
        "/admin/config/docling",
        json={
            "docling_blocks_mode": "raw_docling",
            "reason": "Testing update",
        },
    )

    assert response.status_code == 200
    assert response.json()["docling_blocks_mode"] == "raw_docling"
    assert recorded
    assert recorded[0]["result"] == "ok"
    assert recorded[0]["docling_blocks_mode"] == "raw_docling"


def test_patch_docling_config_rejects_invalid_mode(superuser_client, monkeypatch):
    monkeypatch.setattr(
        "app.api.routes.admin_config_docling.record_admin_config_docling_update",
        lambda **kwargs: None,
    )

    response = superuser_client.patch(
        "/admin/config/docling",
        json={
            "docling_blocks_mode": "invalid_mode",
            "reason": "Bad value",
        },
    )

    assert response.status_code == 422


def test_patch_docling_config_requires_superuser(client):
    response = client.patch(
        "/admin/config/docling",
        json={
            "docling_blocks_mode": "raw_docling",
            "reason": "Test",
        },
    )
    assert response.status_code in (401, 403)
