import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.plugins.gcs import GCSListPlugin, GCSDownloadCsvPlugin
from app.domain.plugins.models import ExecutionContext


@pytest.fixture
def ctx():
    return ExecutionContext(execution_id="test-1")


@pytest.mark.asyncio
async def test_gcs_list_returns_matching_objects(ctx):
    plugin = GCSListPlugin()
    assert "blockdata.load.gcs.list_objects" in plugin.task_types

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "items": [
            {"name": "data/a.csv", "size": "1024"},
            {"name": "data/b.csv", "size": "2048"},
            {"name": "data/c.json", "size": "512"},
        ]
    }

    with patch("app.plugins.gcs.resolve_connection_sync") as mock_conn, \
         patch("app.plugins.gcs.get_gcs_access_token") as mock_token, \
         patch("app.plugins.gcs.httpx") as mock_httpx:
        mock_conn.return_value = {"project_id": "proj", "client_email": "sa@x", "private_key": "k"}
        mock_token.return_value = "fake-token"
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_resp
        mock_httpx.AsyncClient.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_httpx.AsyncClient.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await plugin.run({"connection_id": "c1", "bucket": "my-bucket", "prefix": "data/", "glob": "*.csv"}, ctx)

    assert result.state == "SUCCESS"
    assert len(result.data["objects"]) == 2
    assert result.data["objects"][0]["name"] == "data/a.csv"


@pytest.mark.asyncio
async def test_gcs_download_csv_parses_rows(ctx):
    plugin = GCSDownloadCsvPlugin()
    csv_content = "name,age,city\nAlice,30,NYC\nBob,25,LA"

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = csv_content

    # Mock upload_file on the context so JSONL is "written" to storage
    ctx.upload_file = AsyncMock(return_value="https://storage.example.com/pipeline/load-artifacts/test/a.csv.jsonl")

    with patch("app.plugins.gcs.resolve_connection_sync") as mock_conn, \
         patch("app.plugins.gcs.get_gcs_access_token") as mock_token, \
         patch("app.plugins.gcs.httpx") as mock_httpx:
        mock_conn.return_value = {"project_id": "proj", "client_email": "sa@x", "private_key": "k"}
        mock_token.return_value = "fake-token"
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_resp
        mock_httpx.AsyncClient.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_httpx.AsyncClient.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await plugin.run({"connection_id": "c1", "bucket": "b", "object_name": "data/a.csv"}, ctx)

    assert result.state == "SUCCESS"
    assert result.data["row_count"] == 2
    assert result.data["storage_uri"] == "https://storage.example.com/pipeline/load-artifacts/test/a.csv.jsonl"
