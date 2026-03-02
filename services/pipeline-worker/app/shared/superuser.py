"""Superuser gate — FastAPI dependency for admin endpoints."""

import os

from fastapi import Header, HTTPException

from .supabase_client import get_supabase_admin

SUPERUSER_EMAIL_ALLOWLIST: set[str] = set()


def _load_allowlist() -> set[str]:
    global SUPERUSER_EMAIL_ALLOWLIST
    if not SUPERUSER_EMAIL_ALLOWLIST:
        raw = os.environ.get("SUPERUSER_EMAIL_ALLOWLIST", "")
        SUPERUSER_EMAIL_ALLOWLIST = {
            e.strip().lower() for e in raw.split(",") if e.strip()
        }
    return SUPERUSER_EMAIL_ALLOWLIST


class SuperuserContext:
    __slots__ = ("user_id", "email")

    def __init__(self, user_id: str, email: str):
        self.user_id = user_id
        self.email = email


async def require_superuser(
    authorization: str = Header(..., alias="Authorization"),
) -> SuperuserContext:
    """Validate JWT and check superuser allowlist. Raises 401/403."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing Authorization header")

    token = authorization[7:]
    sb = get_supabase_admin()

    try:
        user_resp = sb.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(401, f"Invalid auth: {exc}") from exc

    user = user_resp.user
    if not user:
        raise HTTPException(401, "Invalid auth: no user")

    email = (user.email or "").lower()
    allowlist = _load_allowlist()

    if not allowlist:
        raise HTTPException(503, "Superuser access is not configured")

    if email not in allowlist:
        raise HTTPException(403, "Forbidden: superuser access required")

    return SuperuserContext(user_id=user.id, email=email)
