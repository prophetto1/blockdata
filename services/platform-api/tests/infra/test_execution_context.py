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


# --- Temp files ---

def test_work_dir_is_lazy(ctx):
    """Working directory is not created until accessed."""
    assert ctx._work_dir is None
    path = ctx.work_dir
    assert path.exists()
    assert ctx._work_dir is not None
    ctx.cleanup()


def test_create_temp_file(ctx):
    """create_temp_file returns a path in the working directory."""
    path = ctx.create_temp_file(suffix=".jsonl")
    assert path.exists()
    assert path.suffix == ".jsonl"
    assert path.parent == ctx.work_dir
    path.write_text('{"test": true}')
    assert path.read_text() == '{"test": true}'
    ctx.cleanup()
    assert not path.exists()


def test_multiple_temp_files_same_dir(ctx):
    """Multiple temp files share the same working directory."""
    p1 = ctx.create_temp_file(suffix=".csv")
    p2 = ctx.create_temp_file(suffix=".jsonl")
    p3 = ctx.create_temp_file(suffix=".parquet")
    assert p1.parent == p2.parent == p3.parent
    assert len({p1, p2, p3}) == 3
    ctx.cleanup()


def test_cleanup_is_idempotent(ctx):
    """cleanup() can be called multiple times without error."""
    ctx.create_temp_file()
    ctx.cleanup()
    ctx.cleanup()
    ctx.cleanup()


def test_cleanup_without_work_dir(ctx):
    """cleanup() on a context that never created temp files is safe."""
    ctx.cleanup()


# --- Template rendering (Jinja2) ---

def test_render_simple_variable():
    ctx = ExecutionContext(variables={"name": "Alice"})
    assert ctx.render("Hello {{ name }}") == "Hello Alice"


def test_render_nested_dict():
    ctx = ExecutionContext(variables={"outputs": {"task1": {"value": 42}}})
    assert ctx.render("Result: {{ outputs.task1.value }}") == "Result: 42"


def test_render_preserves_undefined():
    """Undefined variables are preserved as {{ name }}, not rendered as empty."""
    ctx = ExecutionContext(variables={})
    result = ctx.render("{{ unknown_var }}")
    assert "unknown_var" in result


def test_render_filter_upper():
    ctx = ExecutionContext(variables={"name": "alice"})
    assert ctx.render("{{ name | upper }}") == "ALICE"


def test_render_filter_join():
    ctx = ExecutionContext(variables={"items": ["a", "b", "c"]})
    assert ctx.render("{{ items | join(',') }}") == "a,b,c"


def test_render_filter_default():
    ctx = ExecutionContext(variables={})
    assert ctx.render("{{ missing | default('fallback') }}") == "fallback"


def test_render_filter_length():
    ctx = ExecutionContext(variables={"items": [1, 2, 3]})
    assert ctx.render("{{ items | length }}") == "3"


def test_render_condition_true():
    ctx = ExecutionContext(variables={"active": True})
    assert ctx.render("{% if active %}yes{% else %}no{% endif %}") == "yes"


def test_render_condition_false():
    ctx = ExecutionContext(variables={"active": False})
    assert ctx.render("{% if active %}yes{% else %}no{% endif %}") == "no"


def test_render_loop():
    ctx = ExecutionContext(variables={"items": ["a", "b", "c"]})
    result = ctx.render("{% for x in items %}{{ x }}{% endfor %}")
    assert result == "abc"


def test_render_plain_text():
    """Strings without {{ or {% are returned as-is (fast path)."""
    ctx = ExecutionContext()
    assert ctx.render("just plain text") == "just plain text"


def test_render_non_string():
    """Non-string input is converted to string."""
    ctx = ExecutionContext()
    assert ctx.render(42) == "42"
    assert ctx.render(True) == "True"


def test_render_mixed_resolved_and_unresolved():
    ctx = ExecutionContext(variables={"name": "Alice"})
    result = ctx.render("Hello {{ name }}, your id is {{ user_id }}")
    assert "Alice" in result
    assert "user_id" in result


def test_resolve_still_works():
    """_resolve helper for programmatic access still works."""
    ctx = ExecutionContext(variables={"a": {"b": {"c": "deep"}}})
    assert ctx._resolve("a.b.c") == "deep"
    assert ctx._resolve("a.b.missing") is None
    assert ctx._resolve("nonexistent") is None
