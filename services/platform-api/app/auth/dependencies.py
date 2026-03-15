"""FastAPI auth dependencies — M2M bearer, legacy header, and Supabase JWT auth.

Security schemes are declared as module-level objects so OpenAPI documents
them automatically. require_auth consumes them via Security(), which means
any route using Depends(require_auth) or Depends(require_role(...)) inherits
the security metadata in the OpenAPI spec through the dependency chain.
"""

import logging
from typing import Any, Callable

from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

from app.auth.principals import AuthPrincipal
from app.core.config import get_settings

logger = logging.getLogger("platform-api.auth")

# ---------------------------------------------------------------------------
#  OpenAPI security scheme declarations
# ---------------------------------------------------------------------------

bearer_scheme = HTTPBearer(
    auto_error=False,
    description="M2M token or Supabase JWT",
)
api_key_scheme = APIKeyHeader(
    name="X-Conversion-Service-Key",
    auto_error=False,
    description="Deprecated. Legacy machine-to-machine key — use Bearer token instead.",
)


class SupabaseAuthConfigError(RuntimeError):
    """Raised when server-side Supabase auth settings are missing."""


def _require_supabase_auth_settings() -> tuple[str, str]:
    settings = get_settings()
    missing: list[str] = []
    if not settings.supabase_url:
        missing.append("SUPABASE_URL")
    if not settings.supabase_service_role_key:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if missing:
        raise SupabaseAuthConfigError(
            f"Missing required Supabase auth settings: {', '.join(missing)}"
        )
    return settings.supabase_url, settings.supabase_service_role_key


def _verify_supabase_jwt(token: str) -> Any:
    """Validate a Supabase JWT and return the user object.

    Uses the Supabase Python SDK with service_role key to call auth.get_user(token).
    This validates the JWT signature and expiry server-side.
    """
    from supabase import create_client

    supabase_url, service_role_key = _require_supabase_auth_settings()
    client = create_client(supabase_url, service_role_key)
    response = client.auth.get_user(token)
    if not response or not response.user:
        raise ValueError("Invalid JWT: no user returned")
    return response.user


def _check_superuser(email: str) -> bool:
    """Check if email is in registry_superuser_profiles with is_active=True.

    Mirrors the TypeScript requireSuperuser() logic from
    supabase/functions/_shared/superuser.ts.
    """
    from supabase import create_client

    supabase_url, service_role_key = _require_supabase_auth_settings()
    admin = create_client(supabase_url, service_role_key)

    # First check if any active superuser profiles exist at all
    any_active = (
        admin.table("registry_superuser_profiles")
        .select("superuser_profile_id")
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    if not any_active.data:
        return False

    # Check if this specific email is a superuser
    normalized = email.strip().lower()
    match = (
        admin.table("registry_superuser_profiles")
        .select("superuser_profile_id")
        .eq("email_normalized", normalized)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    return bool(match.data)


async def require_auth(
    bearer_creds: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    api_key: str | None = Security(api_key_scheme),
) -> AuthPrincipal:
    """Authenticate via Bearer token (M2M or JWT) or legacy X-Conversion-Service-Key header.

    Auth resolution order:
    1. Bearer token that exactly matches PLATFORM_API_M2M_TOKEN -> machine M2M
    2. Bearer token that does NOT match M2M -> validate as Supabase JWT
    3. X-Conversion-Service-Key header -> legacy machine auth (deprecated)
    4. No credentials -> 401
    """
    settings = get_settings()

    # --- Path 1 & 2: Bearer token ---
    if bearer_creds is not None:
        token = bearer_creds.credentials

        # Path 1: M2M bearer (exact match)
        if settings.platform_api_m2m_token and token == settings.platform_api_m2m_token:
            return AuthPrincipal(
                subject_type="machine",
                subject_id="m2m-caller",
                roles=frozenset({"platform_admin"}),
                auth_source="m2m_bearer",
            )

        # Path 2: Supabase JWT
        try:
            user = _verify_supabase_jwt(token)
        except SupabaseAuthConfigError as e:
            logger.error("Supabase JWT validation unavailable: %s", e)
            raise HTTPException(status_code=500, detail="Server auth configuration error")
        except Exception as e:
            logger.debug(f"JWT validation failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid bearer token")

        email = (user.email or "").strip().lower()
        roles: set[str] = {"authenticated"}

        # Check superuser status
        try:
            if email and _check_superuser(email):
                roles.add("platform_admin")
        except Exception as e:
            logger.warning(f"Superuser check failed for {email}: {e}")
            # Non-fatal: user still gets authenticated role

        return AuthPrincipal(
            subject_type="user",
            subject_id=user.id,
            roles=frozenset(roles),
            auth_source="supabase_jwt",
            email=email,
        )

    # --- Path 3: Legacy header (deprecated) ---
    if api_key:
        if settings.conversion_service_key and api_key == settings.conversion_service_key:
            return AuthPrincipal(
                subject_type="machine",
                subject_id="legacy-caller",
                roles=frozenset({"platform_admin"}),
                auth_source="legacy_header",
            )
        raise HTTPException(status_code=401, detail="Unauthorized")

    # --- Path 4: No credentials ---
    raise HTTPException(status_code=401, detail="Authentication required")


def require_role(role: str) -> Callable:
    """Factory that returns a dependency requiring a specific role."""

    async def _check(auth: AuthPrincipal = Depends(require_auth)) -> AuthPrincipal:
        if not auth.has_role(role):
            raise HTTPException(status_code=403, detail=f"Role required: {role}")
        return auth

    return _check


# Backward-compatible aliases for admin_services.py migration
SuperuserContext = AuthPrincipal
require_superuser = require_role("platform_admin")


async def require_user_auth(
    auth: AuthPrincipal = Depends(require_auth),
) -> AuthPrincipal:
    """Require human user authentication. Rejects M2M and legacy machine tokens."""
    if auth.subject_type != "user":
        raise HTTPException(status_code=403, detail="User authentication required")
    return auth
