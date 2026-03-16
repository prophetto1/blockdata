"""Authentication providers for external service integrations.

Six patterns that cover nearly every integration. Plugins declare which
pattern they use. The substrate handles credential exchange.

Usage in a plugin:
    from app.infra.auth_providers import resolve_auth
    auth = await resolve_auth(creds)
    # auth.headers → {"Authorization": "Bearer ..."} for HTTP APIs
    # auth.token → raw token string
    # auth.credentials → provider-specific auth object
"""
import base64
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

import httpx


@dataclass
class AuthResult:
    """Standardized auth result that plugins consume."""
    headers: dict[str, str] = field(default_factory=dict)
    token: str = ""
    credentials: dict[str, Any] = field(default_factory=dict)


class AuthProvider(ABC):
    """Base class for all auth patterns."""

    @abstractmethod
    async def authenticate(self, creds: dict[str, Any]) -> AuthResult:
        """Transform raw credentials into ready-to-use auth."""
        ...


# ---------------------------------------------------------------------------
# Simple patterns (no external HTTP calls)
# ---------------------------------------------------------------------------

class APIKeyAuth(AuthProvider):
    """API key in a header. Used by: Anthropic, OpenAI, Cohere, Jina, Voyage.

    Expects creds: {"api_key": "sk-..."}
    Optional: {"header_name": "x-api-key"} (default: "Authorization: Bearer")
    """

    async def authenticate(self, creds: dict[str, Any]) -> AuthResult:
        api_key = creds["api_key"]
        header_name = creds.get("header_name", "")
        if header_name:
            return AuthResult(
                headers={header_name: api_key},
                token=api_key,
                credentials=creds,
            )
        return AuthResult(
            headers={"Authorization": f"Bearer {api_key}"},
            token=api_key,
            credentials=creds,
        )


class BasicAuth(AuthProvider):
    """HTTP Basic authentication. Used by: ArangoDB, Elasticsearch, some JDBC.

    Expects creds: {"username": "...", "password": "..."}
    Also passes through additional fields (endpoint, database, etc.).
    """

    async def authenticate(self, creds: dict[str, Any]) -> AuthResult:
        username = creds["username"]
        password = creds["password"]
        encoded = base64.b64encode(f"{username}:{password}".encode()).decode()
        return AuthResult(
            headers={"Authorization": f"Basic {encoded}"},
            token=encoded,
            credentials=creds,
        )


class ConnectionStringAuth(AuthProvider):
    """Connection string with embedded credentials. Used by: MongoDB, Redis, Postgres, MySQL.

    Expects creds: {"uri": "mongodb+srv://user:pass@host/db"} or similar.
    No HTTP headers — the client library handles auth from the URI.
    """

    async def authenticate(self, creds: dict[str, Any]) -> AuthResult:
        return AuthResult(
            headers={},
            token="",
            credentials=creds,
        )


# ---------------------------------------------------------------------------
# Complex patterns (external HTTP calls for token exchange)
# ---------------------------------------------------------------------------

class OAuth2ServiceAccount(AuthProvider):
    """GCP-style OAuth2 service account. Used by: GCP (all services).

    Expects creds: {"client_email": "...", "private_key": "...", "project_id": "..."}
    Optional: {"scopes": ["https://..."], "token_uri": "https://oauth2.googleapis.com/token"}
    """

    async def authenticate(self, creds: dict[str, Any]) -> AuthResult:
        import jwt as _jwt  # PyJWT

        now = int(time.time())
        scopes = creds.get("scopes", ["https://www.googleapis.com/auth/cloud-platform"])
        token_uri = creds.get("token_uri", "https://oauth2.googleapis.com/token")

        payload = {
            "iss": creds["client_email"],
            "scope": " ".join(scopes) if isinstance(scopes, list) else scopes,
            "aud": token_uri,
            "iat": now,
            "exp": now + 3600,
        }
        signed_jwt = _jwt.encode(payload, creds["private_key"], algorithm="RS256")

        async with httpx.AsyncClient() as client:
            resp = await client.post(token_uri, data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": signed_jwt,
            }, timeout=10)
            resp.raise_for_status()

        access_token = resp.json()["access_token"]
        return AuthResult(
            headers={"Authorization": f"Bearer {access_token}"},
            token=access_token,
            credentials={**creds, "access_token": access_token},
        )


class OAuth2ClientCredentials(AuthProvider):
    """OAuth2 client credentials flow. Used by: Azure, Salesforce, HubSpot.

    Expects creds: {"client_id": "...", "client_secret": "...", "token_url": "..."}
    Optional: {"scope": "https://..."}
    """

    async def authenticate(self, creds: dict[str, Any]) -> AuthResult:
        token_url = creds["token_url"]
        data = {
            "grant_type": "client_credentials",
            "client_id": creds["client_id"],
            "client_secret": creds["client_secret"],
        }
        if creds.get("scope"):
            data["scope"] = creds["scope"]

        async with httpx.AsyncClient() as client:
            resp = await client.post(token_url, data=data, timeout=10)
            resp.raise_for_status()

        access_token = resp.json()["access_token"]
        return AuthResult(
            headers={"Authorization": f"Bearer {access_token}"},
            token=access_token,
            credentials={**creds, "access_token": access_token},
        )


class IAMAuth(AuthProvider):
    """AWS IAM authentication. Used by: AWS (all services).

    Expects creds: {"access_key_id": "...", "secret_access_key": "...", "region": "..."}
    Optional: {"session_token": "..."} for assumed roles.

    NOTE: AWS Signature V4 signing is complex. This provider returns the
    raw credentials for use with boto3/aiobotocore which handle signing
    internally. For direct HTTP calls, use botocore's request signer.
    """

    async def authenticate(self, creds: dict[str, Any]) -> AuthResult:
        return AuthResult(
            headers={},
            token="",
            credentials={
                "aws_access_key_id": creds["access_key_id"],
                "aws_secret_access_key": creds["secret_access_key"],
                "region_name": creds.get("region", "us-east-1"),
                **({"aws_session_token": creds["session_token"]}
                   if creds.get("session_token") else {}),
            },
        )


# ---------------------------------------------------------------------------
# Registry: map auth pattern names to providers
# ---------------------------------------------------------------------------

AUTH_PROVIDERS: dict[str, AuthProvider] = {
    "api_key": APIKeyAuth(),
    "basic": BasicAuth(),
    "connection_string": ConnectionStringAuth(),
    "oauth2_service_account": OAuth2ServiceAccount(),
    "oauth2_client_credentials": OAuth2ClientCredentials(),
    "iam": IAMAuth(),
}


async def resolve_auth(creds: dict[str, Any], auth_type: str | None = None) -> AuthResult:
    """Resolve authentication from credentials.

    If auth_type is provided, uses that specific provider.
    Otherwise, infers from credential fields:
    - Has "api_key" → APIKeyAuth
    - Has "username" + "password" → BasicAuth
    - Has "uri" → ConnectionStringAuth
    - Has "client_email" + "private_key" → OAuth2ServiceAccount
    - Has "client_id" + "client_secret" → OAuth2ClientCredentials
    - Has "access_key_id" → IAMAuth
    """
    if auth_type and auth_type in AUTH_PROVIDERS:
        return await AUTH_PROVIDERS[auth_type].authenticate(creds)

    # Auto-detect from credential fields
    if "api_key" in creds:
        return await AUTH_PROVIDERS["api_key"].authenticate(creds)
    if "username" in creds and "password" in creds:
        return await AUTH_PROVIDERS["basic"].authenticate(creds)
    if "uri" in creds:
        return await AUTH_PROVIDERS["connection_string"].authenticate(creds)
    if "client_email" in creds and "private_key" in creds:
        return await AUTH_PROVIDERS["oauth2_service_account"].authenticate(creds)
    if "client_id" in creds and "client_secret" in creds:
        return await AUTH_PROVIDERS["oauth2_client_credentials"].authenticate(creds)
    if "access_key_id" in creds:
        return await AUTH_PROVIDERS["iam"].authenticate(creds)

    # Fallback: return credentials as-is
    return AuthResult(credentials=creds)
