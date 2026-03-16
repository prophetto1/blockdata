import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.plugins.arangodb import ArangoDBLoadPlugin
from app.domain.plugins.models import ExecutionContext
from app.infra.auth_providers import AuthResult


@pytest.fixture
def ctx():
    return ExecutionContext(execution_id="test-1", user_id="user-1")


def _mock_arango_creds():
    return {
        "endpoint": "https://test.arangodb.cloud:8529",
        "database": "_system",
        "username": "root",
        "password": "secret",
    }


@pytest.mark.asyncio
async def test_load_inserts_documents(ctx):
    plugin = ArangoDBLoadPlugin()
    assert "blockdata.load.arango.batch_insert" in plugin.task_types

    mock_resp = MagicMock()
    mock_resp.status_code = 202
    mock_resp.json.return_value = [
        {"_key": "1", "_id": "users/1"},
        {"_key": "2", "_id": "users/2"},
    ]

    with patch("app.plugins.arangodb.resolve_connection_sync") as mock_conn, \
         patch("app.plugins.arangodb.resolve_auth", new_callable=AsyncMock) as mock_auth, \
         patch("app.plugins.arangodb.httpx") as mock_httpx:
        mock_conn.return_value = _mock_arango_creds()
        mock_auth.return_value = AuthResult(
            headers={"Authorization": "Basic cm9vdDpzZWNyZXQ="},
            token="cm9vdDpzZWNyZXQ=",
            credentials=_mock_arango_creds(),
        )
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_resp
        mock_httpx.AsyncClient.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_httpx.AsyncClient.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_httpx.BasicAuth = MagicMock()

        result = await plugin.run({
            "connection_id": "c1", "collection": "users",
            "documents": [{"name": "Alice"}, {"name": "Bob"}],
        }, ctx)

    assert result.state == "SUCCESS"
    assert result.data["inserted"] == 2


@pytest.mark.asyncio
async def test_load_rejects_missing_collection(ctx):
    plugin = ArangoDBLoadPlugin()
    with patch("app.plugins.arangodb.resolve_connection_sync") as mock_conn, \
         patch("app.plugins.arangodb.resolve_auth", new_callable=AsyncMock) as mock_auth:
        mock_conn.return_value = _mock_arango_creds()
        mock_auth.return_value = AuthResult(credentials=_mock_arango_creds())
        result = await plugin.run({"connection_id": "c1", "documents": [{"a": 1}]}, ctx)
    assert result.state == "FAILED"
