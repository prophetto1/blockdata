import importlib
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.main import create_app

SECRET_ID = "11111111-1111-1111-1111-111111111111"


def _mock_auth_principal():
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated"}),
        auth_source="test",
    )


def _secrets_module():
    return importlib.import_module("app.api.routes.secrets")


@pytest.fixture
def client():
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_auth_principal
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_list_secrets_returns_empty_for_new_user(client):
    secrets_module = _secrets_module()
    with patch.object(secrets_module, "get_supabase_admin") as mock_sb:
        mock_sb.return_value.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
            data=[]
        )

        resp = client.get("/secrets")

    assert resp.status_code == 200
    assert resp.json() == {"secrets": []}


def test_create_secret_returns_metadata_only_and_uses_envelope_key(client):
    secrets_module = _secrets_module()
    inserted = {
        "id": SECRET_ID,
        "name": "OPENAI_API_KEY",
        "description": "OpenAI key",
        "value_kind": "secret",
        "value_suffix": "....1234",
        "created_at": "2026-03-21T12:00:00Z",
        "updated_at": "2026-03-21T12:00:00Z",
    }

    with patch.object(secrets_module, "get_supabase_admin") as mock_sb, patch.object(
        secrets_module, "encrypt_with_context"
    ) as mock_encrypt, patch.object(secrets_module, "get_envelope_key") as mock_get_key:
        mock_get_key.return_value = "app-envelope-key"
        mock_encrypt.return_value = "enc:v1:iv:cipher"
        mock_sb.return_value.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[inserted]
        )

        resp = client.post(
            "/secrets",
            json={
                "name": "openAi_api_key",
                "value": "sk-secret-1234",
                "description": "OpenAI key",
                "value_kind": "secret",
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["secret"]["name"] == "OPENAI_API_KEY"
    assert body["secret"]["value_suffix"] == "....1234"
    assert "value" not in body["secret"]
    assert "value_encrypted" not in body["secret"]

    payload = mock_sb.return_value.table.return_value.insert.call_args.args[0]
    assert payload["name"] == "OPENAI_API_KEY"
    mock_get_key.assert_called_once()


def test_update_secret_returns_metadata_only_and_canonicalizes_name(client):
    secrets_module = _secrets_module()
    updated = {
        "id": SECRET_ID,
        "name": "OPENAI_API_KEY",
        "description": "Rotated key",
        "value_kind": "api_key",
        "value_suffix": "....5678",
        "created_at": "2026-03-21T12:00:00Z",
        "updated_at": "2026-03-21T13:00:00Z",
    }

    with patch.object(secrets_module, "get_supabase_admin") as mock_sb, patch.object(
        secrets_module, "encrypt_with_context"
    ) as mock_encrypt, patch.object(secrets_module, "get_envelope_key") as mock_get_key:
        mock_get_key.return_value = "app-envelope-key"
        mock_encrypt.return_value = "enc:v1:iv:newcipher"
        mock_sb.return_value.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[updated]
        )

        resp = client.patch(
            f"/secrets/{SECRET_ID}",
            json={
                "name": "openAi_api_key",
                "description": "Rotated key",
                "value_kind": "api_key",
                "value": "sk-secret-5678",
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["secret"]["name"] == "OPENAI_API_KEY"
    assert body["secret"]["description"] == "Rotated key"
    assert "value" not in body["secret"]
    assert "value_encrypted" not in body["secret"]

    updates = (
        mock_sb.return_value.table.return_value.update.call_args.args[0]
    )
    assert updates["name"] == "OPENAI_API_KEY"


def test_delete_secret_returns_ok(client):
    secrets_module = _secrets_module()
    with patch.object(secrets_module, "get_supabase_admin") as mock_sb:
        mock_sb.return_value.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": SECRET_ID}]
        )

        resp = client.delete(f"/secrets/{SECRET_ID}")

    assert resp.status_code == 200
    assert resp.json() == {"ok": True, "id": SECRET_ID}


def test_update_secret_rejects_invalid_value_kind_before_storage(client):
    secrets_module = _secrets_module()
    with patch.object(secrets_module, "get_supabase_admin", side_effect=AssertionError("storage should not be reached")):
        resp = client.patch(
            f"/secrets/{SECRET_ID}",
            json={"value_kind": "invalid_kind"},
        )

    assert resp.status_code == 422


def test_update_secret_rejects_empty_patch_body_before_storage(client):
    secrets_module = _secrets_module()
    with patch.object(secrets_module, "get_supabase_admin", side_effect=AssertionError("storage should not be reached")):
        resp = client.patch(f"/secrets/{SECRET_ID}", json={})

    assert resp.status_code == 422


@pytest.mark.parametrize("method", ["patch", "delete"])
def test_secret_routes_reject_invalid_secret_id(client, method):
    secrets_module = _secrets_module()
    request = getattr(client, method)
    kwargs = {"json": {"description": "noop"}} if method == "patch" else {}

    with patch.object(secrets_module, "get_supabase_admin", side_effect=AssertionError("storage should not be reached")):
        resp = request("/secrets/not-a-uuid", **kwargs)

    assert resp.status_code == 422


def test_update_variable_rejects_invalid_value_kind_before_storage(client):
    secrets_module = _secrets_module()
    with patch.object(secrets_module, "get_supabase_admin", side_effect=AssertionError("storage should not be reached")):
        resp = client.patch(
            "/variables/var-1",
            json={"value_kind": "invalid_kind"},
        )

    assert resp.status_code == 422


def test_update_variable_rejects_empty_patch_body_before_storage(client):
    secrets_module = _secrets_module()
    with patch.object(secrets_module, "get_supabase_admin", side_effect=AssertionError("storage should not be reached")):
        resp = client.patch("/variables/var-1", json={})

    assert resp.status_code == 422
