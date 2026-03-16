import pytest
import base64
from unittest.mock import AsyncMock, MagicMock, patch

from app.infra.auth_providers import (
    APIKeyAuth, BasicAuth, ConnectionStringAuth, IAMAuth,
    OAuth2ServiceAccount, OAuth2ClientCredentials,
    resolve_auth, AuthResult,
)


# ---------------------------------------------------------------------------
# Task 5a: Simple patterns (no external HTTP calls)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_api_key_bearer():
    auth = APIKeyAuth()
    result = await auth.authenticate({"api_key": "sk-test-123"})
    assert result.headers["Authorization"] == "Bearer sk-test-123"
    assert result.token == "sk-test-123"


@pytest.mark.asyncio
async def test_api_key_custom_header():
    auth = APIKeyAuth()
    result = await auth.authenticate({"api_key": "sk-test", "header_name": "x-api-key"})
    assert result.headers["x-api-key"] == "sk-test"
    assert "Authorization" not in result.headers


@pytest.mark.asyncio
async def test_basic_auth():
    auth = BasicAuth()
    result = await auth.authenticate({"username": "root", "password": "secret"})
    assert result.headers["Authorization"].startswith("Basic ")
    decoded = base64.b64decode(result.token).decode()
    assert decoded == "root:secret"


@pytest.mark.asyncio
async def test_basic_auth_passes_through_extra_fields():
    auth = BasicAuth()
    result = await auth.authenticate({
        "username": "root", "password": "secret",
        "endpoint": "https://db:8529", "database": "_system",
    })
    assert result.credentials["endpoint"] == "https://db:8529"
    assert result.credentials["database"] == "_system"


@pytest.mark.asyncio
async def test_connection_string():
    auth = ConnectionStringAuth()
    result = await auth.authenticate({"uri": "mongodb+srv://user:pass@host/db"})
    assert result.headers == {}
    assert result.token == ""
    assert result.credentials["uri"] == "mongodb+srv://user:pass@host/db"


@pytest.mark.asyncio
async def test_connection_string_passes_through_all_fields():
    auth = ConnectionStringAuth()
    result = await auth.authenticate({"uri": "redis://localhost", "db": 0})
    assert result.credentials["db"] == 0


# ---------------------------------------------------------------------------
# Task 5a: Auto-detection via resolve_auth
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
async def test_resolve_auth_explicit_type():
    result = await resolve_auth({"api_key": "sk-test"}, auth_type="api_key")
    assert result.token == "sk-test"


@pytest.mark.asyncio
async def test_resolve_auth_unknown_fallback():
    result = await resolve_auth({"some_field": "value"})
    assert result.credentials == {"some_field": "value"}
    assert result.headers == {}


# ---------------------------------------------------------------------------
# Task 5b: Complex patterns (mocked external HTTP calls)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_iam_auth():
    auth = IAMAuth()
    result = await auth.authenticate({
        "access_key_id": "AKIA...",
        "secret_access_key": "secret",
        "region": "us-west-2",
    })
    assert result.credentials["aws_access_key_id"] == "AKIA..."
    assert result.credentials["region_name"] == "us-west-2"
    assert result.headers == {}


@pytest.mark.asyncio
async def test_iam_auth_with_session_token():
    auth = IAMAuth()
    result = await auth.authenticate({
        "access_key_id": "AKIA...",
        "secret_access_key": "secret",
        "session_token": "FwoGZX...",
    })
    assert result.credentials["aws_session_token"] == "FwoGZX..."


@pytest.mark.asyncio
async def test_iam_auth_default_region():
    auth = IAMAuth()
    result = await auth.authenticate({
        "access_key_id": "AKIA",
        "secret_access_key": "secret",
    })
    assert result.credentials["region_name"] == "us-east-1"


@pytest.mark.asyncio
async def test_resolve_auth_iam():
    result = await resolve_auth({"access_key_id": "AKIA", "secret_access_key": "s"})
    assert result.credentials["aws_access_key_id"] == "AKIA"


@pytest.mark.asyncio
async def test_oauth2_service_account():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"access_token": "ya29.test-token"}
    mock_resp.raise_for_status = MagicMock()

    with patch("app.infra.auth_providers.httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_resp
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        auth = OAuth2ServiceAccount()
        result = await auth.authenticate({
            "client_email": "sa@project.iam.gserviceaccount.com",
            "private_key": "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
            "project_id": "my-project",
        })

    assert result.headers["Authorization"] == "Bearer ya29.test-token"
    assert result.token == "ya29.test-token"
    assert result.credentials["access_token"] == "ya29.test-token"
    assert result.credentials["project_id"] == "my-project"


@pytest.mark.asyncio
async def test_oauth2_service_account_custom_scopes():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"access_token": "ya29.scoped"}
    mock_resp.raise_for_status = MagicMock()

    with patch("app.infra.auth_providers.httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_resp
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        auth = OAuth2ServiceAccount()
        result = await auth.authenticate({
            "client_email": "sa@test.iam.gserviceaccount.com",
            "private_key": "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
            "scopes": ["https://www.googleapis.com/auth/devstorage.read_only"],
        })

    assert result.token == "ya29.scoped"


@pytest.mark.asyncio
async def test_resolve_auth_detects_oauth2_service_account():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"access_token": "ya29.auto"}
    mock_resp.raise_for_status = MagicMock()

    with patch("app.infra.auth_providers.httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_resp
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await resolve_auth({
            "client_email": "sa@test.iam.gserviceaccount.com",
            "private_key": "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
        })

    assert result.headers["Authorization"] == "Bearer ya29.auto"


@pytest.mark.asyncio
async def test_oauth2_client_credentials():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"access_token": "eyJ0est"}
    mock_resp.raise_for_status = MagicMock()

    with patch("app.infra.auth_providers.httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_resp
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        auth = OAuth2ClientCredentials()
        result = await auth.authenticate({
            "client_id": "app-id",
            "client_secret": "app-secret",
            "token_url": "https://login.microsoftonline.com/tenant/oauth2/v2.0/token",
            "scope": "https://graph.microsoft.com/.default",
        })

    assert result.headers["Authorization"] == "Bearer eyJ0est"
    assert result.token == "eyJ0est"


@pytest.mark.asyncio
async def test_resolve_auth_detects_oauth2_client_credentials():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"access_token": "eyJhdXRv"}
    mock_resp.raise_for_status = MagicMock()

    with patch("app.infra.auth_providers.httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_resp
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await resolve_auth({
            "client_id": "app-id",
            "client_secret": "app-secret",
            "token_url": "https://auth.example.com/token",
        })

    assert result.headers["Authorization"] == "Bearer eyJhdXRv"
