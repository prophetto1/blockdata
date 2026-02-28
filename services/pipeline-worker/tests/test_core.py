import pytest
from app.plugins.core import (
    LogPlugin, SleepPlugin, PausePlugin,
    IfPlugin, SwitchPlugin, ForEachPlugin,
)


@pytest.mark.asyncio
async def test_log_plugin(context):
    plugin = LogPlugin()
    result = await plugin.run({"message": "hello {{ inputs.name }}"}, context)
    assert result.state == "SUCCESS"
    assert result.logs == ["hello world"]


@pytest.mark.asyncio
async def test_log_plugin_list(context):
    plugin = LogPlugin()
    result = await plugin.run({"message": ["msg1", "msg2"]}, context)
    assert result.state == "SUCCESS"
    assert len(result.logs) == 2


@pytest.mark.asyncio
async def test_sleep_plugin(context):
    plugin = SleepPlugin()
    result = await plugin.run({"duration": "PT0S"}, context)
    assert result.state == "SUCCESS"


@pytest.mark.asyncio
async def test_pause_plugin(context):
    plugin = PausePlugin()
    result = await plugin.run({}, context)
    assert result.state == "PAUSED"


@pytest.mark.asyncio
async def test_if_plugin_true(context):
    plugin = IfPlugin()
    result = await plugin.run({"condition": "{{ outputs.task1.value }}"}, context)
    assert result.state == "SUCCESS"
    assert result.data["branch"] == "then"
    assert result.data["evaluation_result"] is True


@pytest.mark.asyncio
async def test_if_plugin_false(context):
    plugin = IfPlugin()
    result = await plugin.run({"condition": "false"}, context)
    assert result.state == "SUCCESS"
    assert result.data["branch"] == "else"


@pytest.mark.asyncio
async def test_switch_plugin_match(context):
    plugin = SwitchPlugin()
    result = await plugin.run({"value": "a", "cases": {"a": [], "b": []}}, context)
    assert result.data["branch"] == "a"


@pytest.mark.asyncio
async def test_switch_plugin_default(context):
    plugin = SwitchPlugin()
    result = await plugin.run({"value": "z", "cases": {"a": [], "b": []}}, context)
    assert result.data["branch"] == "defaults"


@pytest.mark.asyncio
async def test_foreach_plugin(context):
    plugin = ForEachPlugin()
    result = await plugin.run({"values": [1, 2, 3]}, context)
    assert result.state == "SUCCESS"
    assert result.data["count"] == 3
    assert result.data["items"] == [1, 2, 3]


@pytest.mark.asyncio
async def test_foreach_csv_string(context):
    plugin = ForEachPlugin()
    result = await plugin.run({"values": "a, b, c"}, context)
    assert result.data["count"] == 3
