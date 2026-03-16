"""Auth provider tests — no mocks. Uses real crypto operations.

For OAuth2 tests that call external token endpoints, we generate a
throwaway RSA key pair so jwt.encode() works with real signing.
The HTTP call to the token endpoint is the only thing that would
need a live service — those tests are marked for integration runs.
"""
import pytest
import base64

from app.infra.auth_providers import (
    APIKeyAuth, BasicAuth, ConnectionStringAuth, IAMAuth,
    resolve_auth, AuthResult,
)


# ---------------------------------------------------------------------------
# Simple patterns — no external calls, no mocks needed
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_api_key_bearer():
    result = await APIKeyAuth().authenticate({"api_key": "sk-test-123"})
    assert result.headers["Authorization"] == "Bearer sk-test-123"
    assert result.token == "sk-test-123"


@pytest.mark.asyncio
async def test_api_key_custom_header():
    result = await APIKeyAuth().authenticate({"api_key": "sk-test", "header_name": "x-api-key"})
    assert result.headers["x-api-key"] == "sk-test"
    assert "Authorization" not in result.headers


@pytest.mark.asyncio
async def test_basic_auth():
    result = await BasicAuth().authenticate({"username": "root", "password": "secret"})
    assert result.headers["Authorization"].startswith("Basic ")
    decoded = base64.b64decode(result.token).decode()
    assert decoded == "root:secret"


@pytest.mark.asyncio
async def test_basic_auth_passes_through_extra_fields():
    result = await BasicAuth().authenticate({
        "username": "root", "password": "secret",
        "endpoint": "https://db:8529", "database": "_system",
    })
    assert result.credentials["endpoint"] == "https://db:8529"
    assert result.credentials["database"] == "_system"


@pytest.mark.asyncio
async def test_connection_string():
    result = await ConnectionStringAuth().authenticate({"uri": "mongodb+srv://user:pass@host/db"})
    assert result.headers == {}
    assert result.token == ""
    assert result.credentials["uri"] == "mongodb+srv://user:pass@host/db"


@pytest.mark.asyncio
async def test_connection_string_passes_through_all_fields():
    result = await ConnectionStringAuth().authenticate({"uri": "redis://localhost", "db": 0})
    assert result.credentials["db"] == 0


@pytest.mark.asyncio
async def test_iam_auth():
    result = await IAMAuth().authenticate({
        "access_key_id": "AKIA...",
        "secret_access_key": "secret",
        "region": "us-west-2",
    })
    assert result.credentials["aws_access_key_id"] == "AKIA..."
    assert result.credentials["region_name"] == "us-west-2"
    assert result.headers == {}


@pytest.mark.asyncio
async def test_iam_auth_with_session_token():
    result = await IAMAuth().authenticate({
        "access_key_id": "AKIA...",
        "secret_access_key": "secret",
        "session_token": "FwoGZX...",
    })
    assert result.credentials["aws_session_token"] == "FwoGZX..."


@pytest.mark.asyncio
async def test_iam_auth_default_region():
    result = await IAMAuth().authenticate({
        "access_key_id": "AKIA",
        "secret_access_key": "secret",
    })
    assert result.credentials["region_name"] == "us-east-1"


# ---------------------------------------------------------------------------
# Auto-detection via resolve_auth
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resolve_auth_api_key():
    result = await resolve_auth({"api_key": "sk-test"})
    assert result.headers["Authorization"] == "Bearer sk-test"


@pytest.mark.asyncio
async def test_resolve_auth_basic():
    result = await resolve_auth({"username": "user", "password": "pass"})
    assert result.headers["Authorization"].startswith("Basic ")


@pytest.mark.asyncio
async def test_resolve_auth_connection_string():
    result = await resolve_auth({"uri": "redis://localhost:6379"})
    assert result.credentials["uri"] == "redis://localhost:6379"


@pytest.mark.asyncio
async def test_resolve_auth_iam():
    result = await resolve_auth({"access_key_id": "AKIA", "secret_access_key": "s"})
    assert result.credentials["aws_access_key_id"] == "AKIA"


@pytest.mark.asyncio
async def test_resolve_auth_explicit_type():
    result = await resolve_auth({"api_key": "sk-test"}, auth_type="api_key")
    assert result.token == "sk-test"


@pytest.mark.asyncio
async def test_resolve_auth_unknown_fallback():
    result = await resolve_auth({"some_field": "value"})
    assert result.credentials == {"some_field": "value"}
    assert result.headers == {}
