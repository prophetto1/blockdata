import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.main import create_app


def _mock_auth_principal():
    return AuthPrincipal(
        subject_type="user", subject_id="user-1",
        roles=frozenset({"authenticated"}), auth_source="test",
    )


@pytest.fixture
def client():
    """Create a test client with auth bypassed via dependency_overrides."""
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_auth_principal
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_connect_stores_encrypted_credentials(client):
    with patch("app.api.routes.connections.get_supabase_admin") as mock_sb, \
         patch("app.api.routes.connections.encrypt_with_context") as mock_encrypt, \
         patch("app.api.routes.connections.get_envelope_key", create=True) as mock_get_key:
        mock_get_key.return_value = "app-envelope-key"
        mock_encrypt.return_value = "enc:v1:mock:test"
        mock_table = MagicMock()
        mock_table.upsert.return_value.execute.return_value = MagicMock(data=[{}])
        mock_sb.return_value.table.return_value = mock_table

        resp = client.post("/connections/connect", json={
            "provider": "arangodb",
            "connection_type": "arangodb_credential",
            "credentials": {"endpoint": "https://x:8529", "database": "_system", "username": "root", "password": "secret"},
            "metadata": {"endpoint": "https://x:8529", "database": "_system", "username": "root"},
        })

    assert resp.status_code == 200
    assert resp.json()["ok"] is True
    mock_get_key.assert_called_once()


def test_connect_rejects_missing_provider(client):
    resp = client.post("/connections/connect", json={
        "connection_type": "arangodb_credential",
        "credentials": {},
    })
    assert resp.status_code == 422  # Pydantic validation error


def test_test_connection_calls_plugin(client):
    with patch("app.api.routes.connections.resolve_connection", new_callable=AsyncMock, create=True) as mock_resolve, \
         patch("app.api.routes.connections.resolve_connection_sync", side_effect=AssertionError("sync helper should not be called from async route"), create=True), \
         patch("app.api.routes.connections.resolve_by_function_name") as mock_fn, \
         patch("app.api.routes.connections.resolve") as mock_plugin_resolve:
        mock_resolve.return_value = {"endpoint": "https://x:8529", "database": "d", "username": "u", "password": "p"}

        mock_plugin = AsyncMock()
        mock_plugin.test_connection.return_value = MagicMock(
            state="SUCCESS",
            data={"valid": True},
            logs=["internal probe detail"],
        )
        mock_fn.return_value = "blockdata.load.arango.batch_insert"
        mock_plugin_resolve.return_value = mock_plugin

        resp = client.post("/connections/test", json={
            "connection_id": "conn-1",
            "function_name": "arangodb_load",
        })

    assert resp.status_code == 200
    assert resp.json() == {"valid": True, "data": {"valid": True}}


@pytest.mark.asyncio
async def test_resolve_connection_uses_to_thread():
    from app.infra.connection import resolve_connection, resolve_connection_sync

    async def fake_to_thread(fn, *args):
        assert fn is resolve_connection_sync
        assert args == ("conn-1", "user-1")
        return {"endpoint": "https://x:8529"}

    with patch("app.infra.connection.asyncio.to_thread", side_effect=fake_to_thread) as mock_to_thread:
        result = await resolve_connection("conn-1", "user-1")

    assert result == {"endpoint": "https://x:8529"}
    mock_to_thread.assert_called_once()


def test_disconnect_returns_404_when_connection_missing(client):
    with patch("app.api.routes.connections.get_supabase_admin") as mock_sb:
        mock_sb.return_value.table.return_value.update.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        resp = client.post("/connections/disconnect", json={
            "provider": "arangodb",
            "connection_type": "arangodb_credential",
        })

    assert resp.status_code == 404
    assert resp.json() == {"detail": "Connection not found"}


def test_resolve_connection_uses_dual_key_fallback(client):
    with patch("app.infra.connection.get_supabase_admin") as mock_sb, patch(
        "app.infra.connection.decrypt_with_fallback", create=True
    ) as mock_decrypt:
        mock_sb.return_value.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={
                "credential_encrypted": "enc:v1:iv:cipher",
                "metadata_jsonb": {"endpoint": "https://x:8529"},
                "provider": "arangodb",
                "connection_type": "arangodb_credential",
                "status": "connected",
                "user_id": "user-1",
            }
        )
        mock_decrypt.return_value = '{"username":"root","password":"secret"}'

        from app.infra.connection import resolve_connection_sync

        creds = resolve_connection_sync("conn-1", "user-1")

    assert creds["endpoint"] == "https://x:8529"
    assert creds["username"] == "root"
    mock_decrypt.assert_called_once_with("enc:v1:iv:cipher", "provider-connections-v1")


def test_resolve_connection_backfills_safe_metadata_without_allowing_poison_keys(client):
    with patch("app.infra.connection.get_supabase_admin") as mock_sb, patch(
        "app.infra.connection.decrypt_with_fallback", create=True
    ) as mock_decrypt:
        mock_sb.return_value.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={
                "credential_encrypted": "enc:v1:iv:cipher",
                "metadata_jsonb": {
                    "endpoint": "https://x:8529",
                    "database": "_system",
                    "api_key": "metadata-poison",
                    "username": "metadata-user",
                },
                "provider": "arangodb",
                "connection_type": "arangodb_credential",
                "status": "connected",
                "user_id": "user-1",
            }
        )
        mock_decrypt.return_value = '{"username":"root","password":"secret"}'

        from app.infra.connection import resolve_connection_sync

        creds = resolve_connection_sync("conn-1", "user-1")

    assert creds["endpoint"] == "https://x:8529"
    assert creds["database"] == "_system"
    assert creds["username"] == "root"
    assert creds["password"] == "secret"
    assert "api_key" not in creds
