import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.main import create_app


def _mock_auth_principal():
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated"}),
        auth_source="test",
    )


@pytest.fixture
def client():
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_auth_principal
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_list_variables_returns_empty_for_new_user(client):
    with patch("app.api.routes.variables.get_supabase_admin") as mock_sb:
        mock_sb.return_value.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
            data=[]
        )
        resp = client.get("/variables")

    assert resp.status_code == 200
    assert resp.json() == {"variables": []}


def test_create_variable_returns_metadata_only(client):
    inserted = {
        "id": "var-1",
        "name": "OPENAI_API_KEY",
        "description": "OpenAI key",
        "value_kind": "secret",
        "value_suffix": "....1234",
        "created_at": "2026-03-21T12:00:00Z",
        "updated_at": "2026-03-21T12:00:00Z",
    }

    with patch("app.api.routes.variables.get_supabase_admin") as mock_sb, patch(
        "app.api.routes.variables.encrypt_with_context"
    ) as mock_encrypt:
        mock_encrypt.return_value = "enc:v1:iv:cipher"
        mock_sb.return_value.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[inserted]
        )

        resp = client.post(
            "/variables",
            json={
                "name": "OPENAI_API_KEY",
                "value": "sk-secret-1234",
                "description": "OpenAI key",
                "value_kind": "secret",
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["variable"]["name"] == "OPENAI_API_KEY"
    assert body["variable"]["value_suffix"] == "....1234"
    assert "value" not in body["variable"]


def test_patch_variable_updates_without_returning_plaintext(client):
    updated = {
        "id": "var-1",
        "name": "OPENAI_API_KEY",
        "description": "Rotated key",
        "value_kind": "secret",
        "value_suffix": "....5678",
        "created_at": "2026-03-21T12:00:00Z",
        "updated_at": "2026-03-21T13:00:00Z",
    }

    with patch("app.api.routes.variables.get_supabase_admin") as mock_sb, patch(
        "app.api.routes.variables.encrypt_with_context"
    ) as mock_encrypt:
        mock_encrypt.return_value = "enc:v1:iv:newcipher"
        mock_sb.return_value.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[updated]
        )

        resp = client.patch(
            "/variables/var-1",
            json={
                "description": "Rotated key",
                "value": "sk-secret-5678",
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["variable"]["description"] == "Rotated key"
    assert body["variable"]["value_suffix"] == "....5678"
    assert "value" not in body["variable"]


def test_delete_variable_returns_ok(client):
    with patch("app.api.routes.variables.get_supabase_admin") as mock_sb:
        mock_sb.return_value.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "var-1"}]
        )

        resp = client.delete("/variables/var-1")

    assert resp.status_code == 200
    assert resp.json() == {"ok": True, "id": "var-1"}


def test_user_cannot_access_another_users_variable(client):
    with patch("app.api.routes.variables.get_supabase_admin") as mock_sb:
        mock_sb.return_value.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        resp = client.patch(
            "/variables/var-other",
            json={"description": "should fail"},
        )

    assert resp.status_code == 404
