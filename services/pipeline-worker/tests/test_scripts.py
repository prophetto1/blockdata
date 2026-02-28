import pytest
from app.plugins.scripts import PythonScriptPlugin, ShellScriptPlugin


@pytest.mark.asyncio
async def test_python_script(context):
    plugin = PythonScriptPlugin()
    result = await plugin.run({"script": "print('hello from python')"}, context)
    assert result.state == "SUCCESS"
    assert "hello from python" in result.data["stdout"]


@pytest.mark.asyncio
async def test_python_script_failure(context):
    plugin = PythonScriptPlugin()
    result = await plugin.run({"script": "raise ValueError('boom')"}, context)
    assert result.state == "FAILED"
    assert result.data["exitCode"] != 0


@pytest.mark.asyncio
async def test_python_with_env(context):
    plugin = PythonScriptPlugin()
    result = await plugin.run({
        "script": "import os; print(os.environ['MY_VAR'])",
        "env": {"MY_VAR": "{{ inputs.name }}"},
    }, context)
    assert result.state == "SUCCESS"
    assert "world" in result.data["stdout"]


@pytest.mark.asyncio
async def test_shell_script(context):
    plugin = ShellScriptPlugin()
    result = await plugin.run({"script": "echo 'hello from bash'"}, context)
    assert result.state == "SUCCESS"
    assert "hello from bash" in result.data["stdout"]


@pytest.mark.asyncio
async def test_shell_commands(context):
    plugin = ShellScriptPlugin()
    result = await plugin.run({"commands": ["echo line1", "echo line2"]}, context)
    assert result.state == "SUCCESS"
    assert "line1" in result.data["stdout"]
    assert "line2" in result.data["stdout"]
