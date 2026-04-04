from fastapi.testclient import TestClient

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.main import create_app


def _mock_access_principal():
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated", "blockdata_admin", "platform_admin"}),
        auth_source="test",
        email="admin@example.com",
    )


def test_auth_access_returns_surface_booleans():
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_access_principal
    client = TestClient(app)

    try:
        response = client.get("/auth/access")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "blockdata_admin": True,
        "agchain_admin": False,
        "superuser": True,
    }
