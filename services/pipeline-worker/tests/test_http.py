import pytest
from app.plugins.http import HttpRequestPlugin


@pytest.mark.asyncio
async def test_http_get(context):
    plugin = HttpRequestPlugin()
    result = await plugin.run({"uri": "https://httpbin.org/get", "method": "GET"}, context)
    assert result.state == "SUCCESS"
    assert result.data["statusCode"] == 200
    assert "httpbin.org" in result.data["body"]


@pytest.mark.asyncio
async def test_http_post(context):
    plugin = HttpRequestPlugin()
    result = await plugin.run({
        "uri": "https://httpbin.org/post",
        "method": "POST",
        "body": '{"test": true}',
        "headers": {"Content-Type": "application/json"},
    }, context)
    assert result.state == "SUCCESS"
    assert result.data["statusCode"] == 200


@pytest.mark.asyncio
async def test_http_template_uri(context):
    """Verify {{ expression }} rendering in URI."""
    plugin = HttpRequestPlugin()
    result = await plugin.run({
        "uri": "https://httpbin.org/anything/{{ inputs.name }}",
        "method": "GET",
    }, context)
    assert result.state == "SUCCESS"
    assert "world" in result.data["uri"]


@pytest.mark.asyncio
async def test_http_404(context):
    plugin = HttpRequestPlugin()
    result = await plugin.run({"uri": "https://httpbin.org/status/404"}, context)
    assert result.state == "WARNING"
    assert result.data["statusCode"] == 404
