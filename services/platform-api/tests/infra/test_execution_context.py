import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.domain.plugins.models import ExecutionContext


@pytest.fixture
def ctx():
    return ExecutionContext(
        execution_id="test-exec-1",
        user_id="user-1",
        supabase_url="https://example.supabase.co",
        supabase_key="test-key",
    )


# --- File I/O ---

@pytest.mark.asyncio
async def test_upload_file(ctx):
    with patch("app.infra.storage.upload_to_storage", new_callable=AsyncMock) as mock:
        mock.return_value = "https://example.supabase.co/storage/v1/object/public/bucket/file.jsonl"
        result = await ctx.upload_file("bucket", "file.jsonl", b"data")
    assert result.startswith("https://")
    mock.assert_called_once_with(
        "https://example.supabase.co", "test-key", "bucket", "file.jsonl", b"data"
    )


@pytest.mark.asyncio
async def test_download_file_http_url(ctx):
    """download_file with a full URL fetches directly via httpx."""
    mock_resp = MagicMock()
    mock_resp.content = b'{"row": 1}\n{"row": 2}'
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_resp
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await ctx.download_file("https://example.com/data.jsonl")

    assert result == b'{"row": 1}\n{"row": 2}'
    mock_client.get.assert_called_once_with("https://example.com/data.jsonl", timeout=120)


@pytest.mark.asyncio
async def test_download_file_bucket_path(ctx):
    """download_file with a bucket/path string fetches from Supabase Storage."""
    with patch("app.infra.storage.download_from_storage", new_callable=AsyncMock) as mock:
        mock.return_value = b'{"data": true}'
        result = await ctx.download_file("pipeline/load-artifacts/run-1/file.jsonl")

    assert result == b'{"data": true}'
    mock.assert_called_once_with(
        "https://example.supabase.co", "test-key",
        "pipeline", "load-artifacts/run-1/file.jsonl"
    )


@pytest.mark.asyncio
async def test_list_files(ctx):
    with patch("app.infra.storage.list_storage", new_callable=AsyncMock) as mock:
        mock.return_value = [{"name": "a.jsonl"}, {"name": "b.jsonl"}]
        result = await ctx.list_files("pipeline", "load-artifacts/run-1/")

    assert len(result) == 2
    assert result[0]["name"] == "a.jsonl"


@pytest.mark.asyncio
async def test_delete_files(ctx):
    with patch("app.infra.storage.delete_from_storage", new_callable=AsyncMock) as mock:
        await ctx.delete_files("pipeline", ["load-artifacts/run-1/a.jsonl"])

    mock.assert_called_once_with(
        "https://example.supabase.co", "test-key",
        "pipeline", ["load-artifacts/run-1/a.jsonl"]
    )
