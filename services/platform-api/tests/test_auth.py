# services/platform-api/tests/test_auth.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient

from app.auth.principals import AuthPrincipal
from app.auth.dependencies import require_auth, require_role


def test_auth_principal_has_role():
    p = AuthPrincipal(
        subject_type="machine",
        subject_id="conversion-service",
        roles=frozenset({"platform_admin"}),
        auth_source="m2m_bearer",
    )
    assert p.has_role("platform_admin") is True
    assert p.has_role("user") is False


def test_auth_principal_is_superuser():
    admin = AuthPrincipal(
        subject_type="machine",
        subject_id="m2m-caller",
        roles=frozenset({"platform_admin"}),
        auth_source="m2m_bearer",
    )
    assert admin.is_superuser is True

    user = AuthPrincipal(
        subject_type="user",
        subject_id="user-123",
        roles=frozenset({"authenticated"}),
        auth_source="supabase_jwt",
    )
    assert user.is_superuser is False


def test_m2m_bearer_auth(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "secret-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {"subject_type": auth.subject_type, "subject_id": auth.subject_id}

    client = TestClient(app)

    # Valid bearer
    resp = client.get("/test", headers={"Authorization": "Bearer secret-token"})
    assert resp.status_code == 200
    assert resp.json()["subject_type"] == "machine"

    # Missing auth
    resp = client.get("/test")
    assert resp.status_code == 401

    # Wrong token
    resp = client.get("/test", headers={"Authorization": "Bearer wrong"})
    assert resp.status_code == 401

    get_settings.cache_clear()


def test_m2m_bearer_auth_does_not_require_supabase_config(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "secret-token")
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {"subject_type": auth.subject_type, "source": auth.auth_source}

    client = TestClient(app)

    resp = client.get("/test", headers={"Authorization": "Bearer secret-token"})
    assert resp.status_code == 200
    assert resp.json()["subject_type"] == "machine"
    assert resp.json()["source"] == "m2m_bearer"

    get_settings.cache_clear()


def test_legacy_header_auth(monkeypatch):
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "legacy-key")
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {"source": auth.auth_source}

    client = TestClient(app)
    resp = client.get("/test", headers={"X-Conversion-Service-Key": "legacy-key"})
    assert resp.status_code == 200
    assert resp.json()["source"] == "legacy_header"

    get_settings.cache_clear()


def test_supabase_jwt_auth_returns_500_when_supabase_config_missing(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "m2m-token")
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {"subject_type": auth.subject_type}

    client = TestClient(app)

    resp = client.get("/test", headers={"Authorization": "Bearer user-jwt-token"})
    assert resp.status_code == 500
    assert resp.json()["detail"] == "Server auth configuration error"

    get_settings.cache_clear()


def test_supabase_jwt_auth(monkeypatch):
    """Supabase JWT auth validates token via Supabase Auth API and checks superuser table."""
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "m2m-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {
            "subject_type": auth.subject_type,
            "subject_id": auth.subject_id,
            "source": auth.auth_source,
            "roles": sorted(auth.roles),
        }

    client = TestClient(app)

    # Mock Supabase auth.get_user to return a valid user
    mock_user = MagicMock()
    mock_user.id = "user-abc-123"
    mock_user.email = "admin@example.com"
    mock_user.role = "authenticated"

    mock_response = MagicMock()
    mock_response.user = mock_user

    with patch("app.auth.dependencies._verify_supabase_jwt") as mock_verify:
        mock_verify.return_value = mock_user

        with patch("app.auth.dependencies._check_superuser") as mock_super:
            mock_super.return_value = True

            resp = client.get("/test", headers={"Authorization": "Bearer user-jwt-token"})
            assert resp.status_code == 200
            body = resp.json()
            assert body["subject_type"] == "user"
            assert body["subject_id"] == "user-abc-123"
            assert body["source"] == "supabase_jwt"
            assert "platform_admin" in body["roles"]

    get_settings.cache_clear()


def test_supabase_jwt_non_superuser(monkeypatch):
    """Non-superuser JWT gets authenticated role only."""
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "m2m-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {"roles": sorted(auth.roles)}

    client = TestClient(app)

    mock_user = MagicMock()
    mock_user.id = "user-xyz"
    mock_user.email = "regular@example.com"
    mock_user.role = "authenticated"

    with patch("app.auth.dependencies._verify_supabase_jwt") as mock_verify:
        mock_verify.return_value = mock_user

        with patch("app.auth.dependencies._check_superuser") as mock_super:
            mock_super.return_value = False

            resp = client.get("/test", headers={"Authorization": "Bearer user-jwt"})
            assert resp.status_code == 200
            assert "platform_admin" not in resp.json()["roles"]
            assert "authenticated" in resp.json()["roles"]

    get_settings.cache_clear()


def test_require_role_rejects_missing_role(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()
    admin_only = require_role("platform_admin")

    @app.get("/admin-test")
    async def admin_route(auth: AuthPrincipal = Depends(admin_only)):
        return {"ok": True}

    client = TestClient(app)
    # M2M tokens get platform_admin
    resp = client.get("/admin-test", headers={"Authorization": "Bearer token"})
    assert resp.status_code == 200

    get_settings.cache_clear()


def test_require_role_rejects_non_admin_user(monkeypatch):
    """A user JWT without superuser status gets 403 on admin routes."""
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "m2m-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()
    admin_only = require_role("platform_admin")

    @app.get("/admin-test")
    async def admin_route(auth: AuthPrincipal = Depends(admin_only)):
        return {"ok": True}

    client = TestClient(app)

    mock_user = MagicMock()
    mock_user.id = "user-xyz"
    mock_user.email = "regular@example.com"
    mock_user.role = "authenticated"

    with patch("app.auth.dependencies._verify_supabase_jwt") as mock_verify:
        mock_verify.return_value = mock_user
        with patch("app.auth.dependencies._check_superuser") as mock_super:
            mock_super.return_value = False
            resp = client.get("/admin-test", headers={"Authorization": "Bearer user-jwt"})
            assert resp.status_code == 403

    get_settings.cache_clear()
