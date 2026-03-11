# services/platform-api/tests/test_plugins.py
import pytest
from app.domain.plugins.registry import discover_plugins, FUNCTION_NAME_MAP, PLUGIN_REGISTRY, resolve, resolve_by_function_name
from app.domain.plugins.models import PluginOutput, BasePlugin
from app.domain.plugins.models import ExecutionContext


def test_plugin_output_defaults():
    out = PluginOutput()
    assert out.state == "SUCCESS"
    assert out.data == {}
    assert out.logs == []


def test_execution_context_render():
    ctx = ExecutionContext(
        variables={"inputs": {"name": "world"}, "outputs": {"task1": {"value": 42}}}
    )
    assert ctx.render("Hello {{ inputs.name }}!") == "Hello world!"
    assert ctx.render("Result: {{ outputs.task1.value }}") == "Result: 42"


def test_execution_context_render_preserves_unresolved():
    """Unresolved template expressions are left as-is (not replaced with None)."""
    ctx = ExecutionContext(variables={})
    assert ctx.render("{{ missing.path }}") == "{{ missing.path }}"


def test_execution_context_get_secret(monkeypatch):
    monkeypatch.setenv("MY_SECRET", "s3cret")
    ctx = ExecutionContext()
    import asyncio
    result = asyncio.run(ctx.get_secret("MY_SECRET"))
    assert result == "s3cret"


def test_execution_context_upload_file_returns_public_url(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")

    async def fake_upload(supabase_url, supabase_key, bucket, path, content, content_type="application/octet-stream"):
        return f"{supabase_url}/storage/v1/object/public/{bucket}/{path}"

    monkeypatch.setattr("app.infra.storage.upload_to_storage", fake_upload)

    ctx = ExecutionContext()
    import asyncio
    url = asyncio.run(ctx.upload_file("documents", "test/file.md", b"hello"))
    assert "documents" in url
    assert "test/file.md" in url


def test_discover_plugins_finds_builtin():
    discover_plugins()
    assert len(PLUGIN_REGISTRY) > 0
    assert len(FUNCTION_NAME_MAP) > 0
    # Verify a known plugin exists
    assert "core_log" in FUNCTION_NAME_MAP


def test_resolve_returns_plugin():
    discover_plugins()
    task_type = FUNCTION_NAME_MAP.get("core_log")
    plugin = resolve(task_type)
    assert plugin is not None
    assert isinstance(plugin, BasePlugin)


def test_resolve_by_function_name():
    discover_plugins()
    task_type = resolve_by_function_name("core_log")
    assert task_type is not None
    assert "log" in task_type.lower() or "Log" in task_type
