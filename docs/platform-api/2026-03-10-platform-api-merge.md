# Platform API Merge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge `pipeline-worker` and `conversion-service` into a single `platform-api` FastAPI service with unified auth, route collision protection, and conversion isolation — ready for future crew/embedding/job modules.

**Architecture:** Create `services/platform-api/` with a routed FastAPI app. Extract conversion-service's monolith into domain modules. Port pipeline-worker's shared code into organized `infra/` and `domain/` packages. Add a reserved-slug collision check at startup. Unify auth with `AuthPrincipal` supporting M2M bearer, legacy header, and Supabase JWT. Isolate Docling conversion in a `ProcessPoolExecutor` with saturation tracking and readiness gating. Preserve all existing route contracts and response shapes exactly.

**Tech Stack:** Python 3.11, FastAPI, Pydantic v2, httpx, Docling, eyecite, Supabase Python SDK, pytest, pytest-asyncio

**Reference docs:**
- Problem brief: `docs/platform-api/briefs/2026-03-10-platform-api-merge.md`
- Architecture diagrams: `docs/architecture/bd2-architecture.html`

**Review notes:** This plan incorporates findings from two independent assessments:
- ProcessPoolExecutor is now designed and tested (was promised but missing)
- Auth is decision-complete for M2M, legacy header, AND Supabase JWT (was TODO). Machine callers authenticated with the shared platform token are treated as trusted platform administrators in v1 — this is intentional given the single shared service secret with no per-caller identity. Per-caller machine roles (e.g., `plugin_executor`, `conversion_caller`) are a v2 improvement.
- Plugin port faithfully preserves ExecutionContext behavior (was stubbed)
- Migration includes dual-run period, registry migration, rollback, and edge function updates (was thin)
- Eyecite: pipeline-worker's 8 plugins (task-level) and conversion-service's `/citations` endpoint (document-level) are both ported — they serve different purposes
- Cloud Run concurrency config is explicit
- Auth middleware preserved for `/convert` and `/citations` (auth before body parse)
- `AuthPrincipal.user_id` property alias added for admin_services.py compatibility
- `requirements.txt` and `pyproject.toml` moved to Task 1 so tests can run from Task 2 onward
- ProcessPoolExecutor uses explicit `fork` context for cross-platform consistency

---

### Task 1: Scaffold platform-api directory structure

**Files:**
- Create: `services/platform-api/app/__init__.py`
- Create: `services/platform-api/app/core/__init__.py`
- Create: `services/platform-api/app/auth/__init__.py`
- Create: `services/platform-api/app/api/__init__.py`
- Create: `services/platform-api/app/api/routes/__init__.py`
- Create: `services/platform-api/app/domain/__init__.py`
- Create: `services/platform-api/app/domain/conversion/__init__.py`
- Create: `services/platform-api/app/domain/plugins/__init__.py`
- Create: `services/platform-api/app/infra/__init__.py`
- Create: `services/platform-api/app/plugins/__init__.py`
- Create: `services/platform-api/app/workers/__init__.py`
- Create: `services/platform-api/tests/__init__.py`

**Step 1: Create all directories and init files**

```bash
mkdir -p services/platform-api/app/{core,auth,api/routes,domain/conversion,domain/plugins,infra,plugins,workers}
mkdir -p services/platform-api/tests
touch services/platform-api/app/__init__.py
touch services/platform-api/app/core/__init__.py
touch services/platform-api/app/auth/__init__.py
touch services/platform-api/app/api/__init__.py
touch services/platform-api/app/api/routes/__init__.py
touch services/platform-api/app/domain/__init__.py
touch services/platform-api/app/domain/conversion/__init__.py
touch services/platform-api/app/domain/plugins/__init__.py
touch services/platform-api/app/infra/__init__.py
touch services/platform-api/app/plugins/__init__.py
touch services/platform-api/app/workers/__init__.py
touch services/platform-api/tests/__init__.py
```

**Step 2: Write requirements.txt (union of both services)**

> **Moved here from Task 10** so that `pip install` works before any test runs.

```
# services/platform-api/requirements.txt
fastapi>=0.110
uvicorn[standard]>=0.27
pydantic>=2.6
httpx>=0.26
supabase>=2.0
docling>=2.70.0
eyecite>=2.7
lxml>=5.0
pytest>=8.0
pytest-asyncio>=0.23
```

**Step 3: Write pyproject.toml**

> **Required** so pytest can resolve `from app.core...` imports without PYTHONPATH hacks.

```toml
# services/platform-api/pyproject.toml
[project]
name = "blockdata-platform-api"
requires-python = ">=3.11"

[tool.pytest.ini_options]
pythonpath = ["."]
asyncio_mode = "auto"
```

**Step 4: Write tests/conftest.py**

> **Shared fixture** — every test file currently duplicates `get_settings.cache_clear()`. Centralize it.

```python
# services/platform-api/tests/conftest.py
import pytest


@pytest.fixture(autouse=True)
def clear_settings_cache():
    """Clear cached settings before and after each test."""
    from app.core.config import get_settings
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
```

**Step 5: Install dependencies**

Run: `cd services/platform-api && pip install -r requirements.txt`

**Step 6: Verify structure**

Run: `find services/platform-api -type f | sort`

Expected: All `__init__.py` files, `requirements.txt`, `pyproject.toml`, `tests/conftest.py` present.

**Step 7: Commit**

```bash
git add services/platform-api/
git commit -m "chore: scaffold platform-api directory structure with deps"
```

---

### Task 2: Create core config and reserved routes

**Files:**
- Create: `services/platform-api/app/core/config.py`
- Create: `services/platform-api/app/core/reserved_routes.py`
- Test: `services/platform-api/tests/test_reserved_routes.py`

**Step 1: Write the failing test**

```python
# services/platform-api/tests/test_reserved_routes.py
import pytest
from app.core.reserved_routes import RESERVED_SLUGS, check_collisions


def test_reserved_slugs_contains_known_routes():
    assert "health" in RESERVED_SLUGS
    assert "convert" in RESERVED_SLUGS
    assert "citations" in RESERVED_SLUGS
    assert "functions" in RESERVED_SLUGS
    assert "admin" in RESERVED_SLUGS
    assert "api" in RESERVED_SLUGS


def test_check_collisions_passes_for_safe_names():
    safe_names = {"eyecite_clean", "core_log", "scripts_python_script"}
    # Should not raise
    check_collisions(safe_names)


def test_check_collisions_raises_for_reserved_slug():
    bad_names = {"eyecite_clean", "convert", "health"}
    with pytest.raises(RuntimeError, match="collide with reserved"):
        check_collisions(bad_names)
```

**Step 2: Run test to verify it fails**

Run: `cd services/platform-api && python -m pytest tests/test_reserved_routes.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.core.reserved_routes'`

**Step 3: Write config.py**

```python
# services/platform-api/app/core/config.py
"""Centralized configuration from environment variables."""

import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    platform_api_m2m_token: str = ""
    conversion_service_key: str = ""  # backward compat alias
    log_level: str = "INFO"

    @classmethod
    def from_env(cls) -> "Settings":
        m2m = os.environ.get("PLATFORM_API_M2M_TOKEN", "")
        conv_key = os.environ.get("CONVERSION_SERVICE_KEY", "")
        return cls(
            supabase_url=os.environ.get("SUPABASE_URL", ""),
            supabase_service_role_key=os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
            platform_api_m2m_token=m2m or conv_key,
            conversion_service_key=conv_key or m2m,
            log_level=os.environ.get("LOG_LEVEL", "INFO"),
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()
```

**Step 4: Write reserved_routes.py**

```python
# services/platform-api/app/core/reserved_routes.py
"""Startup collision check — prevents plugins from shadowing explicit routes."""

RESERVED_SLUGS: frozenset[str] = frozenset({
    "health",
    "functions",
    "convert",
    "citations",
    "admin",
    "api",
    "docs",
    "openapi.json",
    "redoc",
})


def check_collisions(function_names: set[str]) -> None:
    """Raise RuntimeError if any plugin function name matches a reserved slug."""
    collisions = function_names & RESERVED_SLUGS
    if collisions:
        raise RuntimeError(
            f"Plugin function names collide with reserved routes: {sorted(collisions)}. "
            "Rename the conflicting plugins or their task_types."
        )
```

**Step 5: Run test to verify it passes**

Run: `cd services/platform-api && python -m pytest tests/test_reserved_routes.py -v`
Expected: 3 passed

**Step 6: Commit**

```bash
git add services/platform-api/app/core/ services/platform-api/tests/test_reserved_routes.py
git commit -m "feat(platform-api): add core config and reserved route collision check"
```

---

### Task 3: Create unified auth system

> **CHANGED FROM ORIGINAL:** Auth is now decision-complete. M2M bearer, legacy header, AND Supabase JWT are all implemented. The superuser module (missing in pipeline-worker, exists in TypeScript edge functions) is ported to Python. Every auth path produces an `AuthPrincipal` with explicit roles. In v1, machine callers authenticated with the shared platform token (`PLATFORM_API_M2M_TOKEN` or `CONVERSION_SERVICE_KEY`) are treated as trusted platform administrators — this is honest and intentional given the single shared service secret with no per-caller identity. Per-caller machine roles are a v2 improvement.

**Files:**
- Create: `services/platform-api/app/auth/principals.py`
- Create: `services/platform-api/app/auth/dependencies.py`
- Create: `services/platform-api/app/auth/middleware.py`
- Test: `services/platform-api/tests/test_auth.py`

**Step 1: Write the failing test**

```python
# services/platform-api/tests/test_auth.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient

from app.auth.principals import AuthPrincipal
from app.auth.dependencies import require_auth, require_role


def test_auth_principal_has_role():
    p = AuthPrincipal(
        subject_type="machine",
        subject_id="conversion-service",
        roles=frozenset({"platform_admin"}),
        auth_source="m2m_bearer",
    )
    assert p.has_role("platform_admin") is True
    assert p.has_role("user") is False


def test_auth_principal_is_superuser():
    admin = AuthPrincipal(
        subject_type="machine",
        subject_id="m2m-caller",
        roles=frozenset({"platform_admin"}),
        auth_source="m2m_bearer",
    )
    assert admin.is_superuser is True

    user = AuthPrincipal(
        subject_type="user",
        subject_id="user-123",
        roles=frozenset({"authenticated"}),
        auth_source="supabase_jwt",
    )
    assert user.is_superuser is False


def test_m2m_bearer_auth(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "secret-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {"subject_type": auth.subject_type, "subject_id": auth.subject_id}

    client = TestClient(app)

    # Valid bearer
    resp = client.get("/test", headers={"Authorization": "Bearer secret-token"})
    assert resp.status_code == 200
    assert resp.json()["subject_type"] == "machine"

    # Missing auth
    resp = client.get("/test")
    assert resp.status_code == 401

    # Wrong token
    resp = client.get("/test", headers={"Authorization": "Bearer wrong"})
    assert resp.status_code == 401

    get_settings.cache_clear()


def test_legacy_header_auth(monkeypatch):
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "legacy-key")
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {"source": auth.auth_source}

    client = TestClient(app)
    resp = client.get("/test", headers={"X-Conversion-Service-Key": "legacy-key"})
    assert resp.status_code == 200
    assert resp.json()["source"] == "legacy_header"

    get_settings.cache_clear()


def test_supabase_jwt_auth(monkeypatch):
    """Supabase JWT auth validates token via Supabase Auth API and checks superuser table."""
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "m2m-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {
            "subject_type": auth.subject_type,
            "subject_id": auth.subject_id,
            "source": auth.auth_source,
            "roles": sorted(auth.roles),
        }

    client = TestClient(app)

    # Mock Supabase auth.get_user to return a valid user
    mock_user = MagicMock()
    mock_user.id = "user-abc-123"
    mock_user.email = "admin@example.com"
    mock_user.role = "authenticated"

    mock_response = MagicMock()
    mock_response.user = mock_user

    with patch("app.auth.dependencies._verify_supabase_jwt") as mock_verify:
        mock_verify.return_value = mock_user

        with patch("app.auth.dependencies._check_superuser") as mock_super:
            mock_super.return_value = True

            resp = client.get("/test", headers={"Authorization": "Bearer user-jwt-token"})
            assert resp.status_code == 200
            body = resp.json()
            assert body["subject_type"] == "user"
            assert body["subject_id"] == "user-abc-123"
            assert body["source"] == "supabase_jwt"
            assert "platform_admin" in body["roles"]

    get_settings.cache_clear()


def test_supabase_jwt_non_superuser(monkeypatch):
    """Non-superuser JWT gets authenticated role only."""
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "m2m-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {"roles": sorted(auth.roles)}

    client = TestClient(app)

    mock_user = MagicMock()
    mock_user.id = "user-xyz"
    mock_user.email = "regular@example.com"
    mock_user.role = "authenticated"

    with patch("app.auth.dependencies._verify_supabase_jwt") as mock_verify:
        mock_verify.return_value = mock_user

        with patch("app.auth.dependencies._check_superuser") as mock_super:
            mock_super.return_value = False

            resp = client.get("/test", headers={"Authorization": "Bearer user-jwt"})
            assert resp.status_code == 200
            assert "platform_admin" not in resp.json()["roles"]
            assert "authenticated" in resp.json()["roles"]

    get_settings.cache_clear()


def test_require_role_rejects_missing_role(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()
    admin_only = require_role("platform_admin")

    @app.get("/admin-test")
    async def admin_route(auth: AuthPrincipal = Depends(admin_only)):
        return {"ok": True}

    client = TestClient(app)
    # M2M tokens get platform_admin
    resp = client.get("/admin-test", headers={"Authorization": "Bearer token"})
    assert resp.status_code == 200

    get_settings.cache_clear()


def test_require_role_rejects_non_admin_user(monkeypatch):
    """A user JWT without superuser status gets 403 on admin routes."""
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "m2m-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()
    admin_only = require_role("platform_admin")

    @app.get("/admin-test")
    async def admin_route(auth: AuthPrincipal = Depends(admin_only)):
        return {"ok": True}

    client = TestClient(app)

    mock_user = MagicMock()
    mock_user.id = "user-xyz"
    mock_user.email = "regular@example.com"
    mock_user.role = "authenticated"

    with patch("app.auth.dependencies._verify_supabase_jwt") as mock_verify:
        mock_verify.return_value = mock_user
        with patch("app.auth.dependencies._check_superuser") as mock_super:
            mock_super.return_value = False
            resp = client.get("/admin-test", headers={"Authorization": "Bearer user-jwt"})
            assert resp.status_code == 403

    get_settings.cache_clear()
```

**Step 2: Run test to verify it fails**

Run: `cd services/platform-api && python -m pytest tests/test_auth.py -v`
Expected: FAIL with `ModuleNotFoundError`

**Step 3: Write principals.py**

```python
# services/platform-api/app/auth/principals.py
"""AuthPrincipal — unified identity type for all auth sources."""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class AuthPrincipal:
    subject_type: str  # "machine" | "user"
    subject_id: str
    roles: frozenset[str] = field(default_factory=frozenset)
    auth_source: str = ""  # "legacy_header" | "m2m_bearer" | "supabase_jwt"
    email: str = ""  # populated for user JWTs

    def has_role(self, role: str) -> bool:
        return role in self.roles

    @property
    def user_id(self) -> str:
        """Alias for subject_id — admin_services.py accesses su.user_id."""
        return self.subject_id

    @property
    def is_superuser(self) -> bool:
        return "platform_admin" in self.roles
```

**Step 4: Write dependencies.py**

> **Key design decisions:**
> - M2M bearer: exact match against `PLATFORM_API_M2M_TOKEN` → gets `platform_admin` role. This is the machine-to-machine path used by edge functions and Kestra.
> - Legacy header: exact match against `CONVERSION_SERVICE_KEY` → gets `platform_admin` role. Backward compat for existing edge function callers.
> - Supabase JWT: any bearer token that is NOT the M2M token is validated against `supabase.auth.get_user()`. If valid, user gets `authenticated` role. If email matches `registry_superuser_profiles` table, user also gets `platform_admin` role. This mirrors the TypeScript `requireSuperuser()` in `supabase/functions/_shared/superuser.ts`.

```python
# services/platform-api/app/auth/dependencies.py
"""FastAPI auth dependencies — M2M bearer, legacy header, and Supabase JWT auth."""

import logging
from typing import Any, Callable

from fastapi import Depends, Header, HTTPException, Request

from app.auth.principals import AuthPrincipal
from app.core.config import get_settings

logger = logging.getLogger("platform-api.auth")


def _verify_supabase_jwt(token: str) -> Any:
    """Validate a Supabase JWT and return the user object.

    Uses the Supabase Python SDK with service_role key to call auth.get_user(token).
    This validates the JWT signature and expiry server-side.
    """
    from supabase import create_client

    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
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

    settings = get_settings()
    admin = create_client(settings.supabase_url, settings.supabase_service_role_key)

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
    request: Request,
    authorization: str | None = Header(default=None),
    x_conversion_service_key: str | None = Header(default=None),
) -> AuthPrincipal:
    """Authenticate via Bearer token (M2M or JWT) or legacy X-Conversion-Service-Key header.

    Auth resolution order:
    1. Bearer token that exactly matches PLATFORM_API_M2M_TOKEN → machine M2M
    2. Bearer token that does NOT match M2M → validate as Supabase JWT
    3. X-Conversion-Service-Key header → legacy machine auth
    4. No credentials → 401
    """
    settings = get_settings()

    # --- Path 1 & 2: Bearer token ---
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

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

    # --- Path 3: Legacy header ---
    if x_conversion_service_key:
        if settings.conversion_service_key and x_conversion_service_key == settings.conversion_service_key:
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
```

**Step 5: Write auth/middleware.py**

> **Preserves conversion-service contract:** Auth must run *before* body parsing on `/convert` and `/citations`. With `Depends()`, FastAPI parses the body first — wrong auth + malformed JSON → 422 instead of 401. The middleware approach ensures 401 fires before any body validation, matching the existing behavior.

```python
# services/platform-api/app/auth/middleware.py
"""Auth middleware for routes that need auth BEFORE body parsing.

The /convert and /citations endpoints must reject unauthenticated requests
before attempting to parse the request body. This prevents:
1. Information leakage (422 validation errors reveal expected schema)
2. Unnecessary processing of large document upload bodies
3. Contract break with existing edge function callers that expect 401

All other routes use Depends(require_auth) which is simpler but runs
after body parsing.
"""

import os

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


# Paths that require auth-before-body-parse
_GUARDED_PATHS = frozenset({"/convert", "/citations"})


class AuthBeforeBodyMiddleware(BaseHTTPMiddleware):
    """Reject unauthenticated requests to guarded paths before body parsing."""

    async def dispatch(self, request: Request, call_next):
        if request.url.path not in _GUARDED_PATHS or request.method.upper() != "POST":
            return await call_next(request)

        # Check M2M bearer
        auth_header = request.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()
            m2m_token = os.environ.get("PLATFORM_API_M2M_TOKEN", "")
            conv_key = os.environ.get("CONVERSION_SERVICE_KEY", "")
            expected = m2m_token or conv_key
            if expected and token == expected:
                return await call_next(request)
            # Non-M2M bearer tokens (JWTs) are validated in Depends() —
            # let them through the middleware and fail in the dependency if invalid.
            # This is acceptable because JWT callers are user-facing, not edge functions.
            if token:
                return await call_next(request)
            return JSONResponse(status_code=401, content={"detail": "Invalid bearer token"})

        # Check legacy header
        legacy_key = request.headers.get("x-conversion-service-key", "")
        if legacy_key:
            expected = os.environ.get("CONVERSION_SERVICE_KEY", "")
            if expected and legacy_key == expected:
                return await call_next(request)
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

        # No credentials
        return JSONResponse(status_code=401, content={"detail": "Authentication required"})
```

**Step 6: Run test to verify it passes**

Run: `cd services/platform-api && python -m pytest tests/test_auth.py -v`
Expected: 8 passed

**Step 7: Commit**

```bash
git add services/platform-api/app/auth/ services/platform-api/tests/test_auth.py
git commit -m "feat(platform-api): add unified auth with M2M, legacy header, Supabase JWT, and middleware"
```

---

### Task 4: Port infrastructure modules

**Files:**
- Create: `services/platform-api/app/infra/supabase_client.py`
- Create: `services/platform-api/app/infra/storage.py`
- Create: `services/platform-api/app/infra/http_client.py`

**Step 1: Write supabase_client.py**

Copy from `services/pipeline-worker/app/shared/supabase_client.py` — identical content:

```python
# services/platform-api/app/infra/supabase_client.py
"""Supabase admin client — service_role access for CRUD operations."""

import os
from functools import lru_cache

from supabase import Client, create_client


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    """Return a service_role Supabase client (cached singleton)."""
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
        )
    return create_client(url, key)
```

**Step 2: Write storage.py**

Port from `services/pipeline-worker/app/shared/storage.py` — identical content:

```python
# services/platform-api/app/infra/storage.py
"""Supabase Storage helpers for file I/O."""

import httpx


async def upload_to_storage(
    supabase_url: str,
    supabase_key: str,
    bucket: str,
    path: str,
    content: bytes,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload bytes to Supabase Storage. Returns the public URL."""
    url = f"{supabase_url}/storage/v1/object/{bucket}/{path}"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            content=content,
            headers={
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": content_type,
            },
        )
        resp.raise_for_status()
    return f"{supabase_url}/storage/v1/object/public/{bucket}/{path}"


async def download_from_storage(
    supabase_url: str,
    supabase_key: str,
    bucket: str,
    path: str,
) -> bytes:
    """Download bytes from Supabase Storage."""
    url = f"{supabase_url}/storage/v1/object/{bucket}/{path}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            url,
            headers={"Authorization": f"Bearer {supabase_key}"},
        )
        resp.raise_for_status()
    return resp.content
```

**Step 3: Write http_client.py**

```python
# services/platform-api/app/infra/http_client.py
"""Shared HTTP helpers for uploads and callbacks."""

from typing import Any, Optional

import httpx


async def upload_bytes(signed_upload_url: str, payload: bytes, content_type: str) -> None:
    """PUT bytes to a Supabase signed upload URL."""
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.put(signed_upload_url, content=payload, headers={"Content-Type": content_type})
        if resp.status_code >= 300:
            raise RuntimeError(f"Upload failed: HTTP {resp.status_code} {resp.text[:500]}")


async def post_callback(callback_url: str, payload: dict[str, Any], shared_secret: str) -> None:
    """POST JSON callback with auth header."""
    async with httpx.AsyncClient(timeout=30) as client:
        await client.post(
            callback_url,
            json=payload,
            headers={"X-Conversion-Service-Key": shared_secret},
        )


async def download_bytes(url: str) -> bytes:
    """GET bytes from a URL."""
    async with httpx.AsyncClient(timeout=180) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content


def append_token_if_needed(url: str, token: Optional[str]) -> str:
    """Append token query param to signed URL if not already present."""
    if not token or "token=" in url:
        return url
    join = "&" if "?" in url else "?"
    return f"{url}{join}token={token}"
```

**Step 4: Commit**

```bash
git add services/platform-api/app/infra/
git commit -m "feat(platform-api): port infrastructure modules"
```

---

### Task 5: Port plugin system with faithful ExecutionContext

> **CHANGED FROM ORIGINAL:** ExecutionContext now faithfully ports the actual behavior from `pipeline-worker/app/shared/context.py` including real `upload_file` via Supabase Storage and `get_secret` from env vars. The original plan stubbed both methods, which would break HTTP and script plugins that depend on storage uploads.

**Files:**
- Create: `services/platform-api/app/domain/plugins/models.py`
- Create: `services/platform-api/app/domain/plugins/registry.py`
- Create: `services/platform-api/app/domain/plugins/execution.py`
- Copy: `services/platform-api/app/plugins/core.py` (from pipeline-worker)
- Copy: `services/platform-api/app/plugins/http.py` (from pipeline-worker)
- Copy: `services/platform-api/app/plugins/scripts.py` (from pipeline-worker)
- Copy: `services/platform-api/app/plugins/eyecite.py` (from pipeline-worker)
- Test: `services/platform-api/tests/test_plugins.py`

**Step 1: Write the failing test**

```python
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
```

**Step 2: Run test to verify it fails**

Run: `cd services/platform-api && python -m pytest tests/test_plugins.py -v`
Expected: FAIL with `ModuleNotFoundError`

**Step 3: Write domain/plugins/models.py**

This replaces `pipeline-worker/app/shared/base.py`, `output.py`, and `context.py`:

```python
# services/platform-api/app/domain/plugins/models.py
"""Plugin system models — base class, output, context."""

import logging
import os
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel, Field


class PluginOutput(BaseModel):
    """Standardized output from every plugin execution."""
    data: dict[str, Any] = Field(default_factory=dict)
    state: str = "SUCCESS"  # SUCCESS | FAILED | WARNING
    logs: list[str] = Field(default_factory=list)


class PluginParam(BaseModel):
    """Schema for a single plugin parameter."""
    name: str
    type: str
    required: bool = False
    default: Any = None
    description: str = ""
    values: list[str] | None = None


class BasePlugin(ABC):
    """Every plugin implements this. Maps to Kestra's RunnableTask<Output>."""
    task_types: list[str] = []

    @abstractmethod
    async def run(self, params: dict[str, Any], context: "ExecutionContext") -> PluginOutput:
        ...

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return []


@dataclass
class ExecutionContext:
    """Provides template rendering, logging, and service access to plugins.

    Faithful port of pipeline-worker/app/shared/context.py.
    All methods preserve the same signatures and behavior.
    """
    execution_id: str = ""
    task_run_id: str = ""
    variables: dict[str, Any] = field(default_factory=dict)
    supabase_url: str = ""
    supabase_key: str = ""
    logger: logging.Logger = field(default_factory=lambda: logging.getLogger("plugin"))

    def __post_init__(self):
        if not self.supabase_url:
            self.supabase_url = os.environ.get("SUPABASE_URL", "")
        if not self.supabase_key:
            self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    def render(self, template: str) -> str:
        """Render Kestra-style {{ expression }} templates.

        Supports dotted paths: {{ outputs.task1.value }}
        Unresolved expressions are preserved as-is.
        """
        if not isinstance(template, str):
            return str(template)

        def replace_expr(match: re.Match) -> str:
            expr = match.group(1).strip()
            value = self._resolve(expr)
            return str(value) if value is not None else match.group(0)

        return re.sub(r"\{\{\s*(.+?)\s*\}\}", replace_expr, template)

    def _resolve(self, dotted_path: str) -> Any:
        """Resolve a dotted path like 'outputs.task1.value' against variables."""
        parts = dotted_path.split(".")
        current: Any = self.variables
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return None
        return current

    async def get_secret(self, key: str) -> str:
        """Fetch a secret value. Currently reads from env vars."""
        return os.environ.get(key, "")

    async def upload_file(self, bucket: str, path: str, content: bytes) -> str:
        """Upload to Supabase Storage. Returns public URL.

        Uses the real storage helper for actual HTTP uploads in production.
        """
        from app.infra.storage import upload_to_storage
        return await upload_to_storage(
            self.supabase_url, self.supabase_key, bucket, path, content
        )


def success(data: dict[str, Any] | None = None, logs: list[str] | None = None) -> PluginOutput:
    return PluginOutput(data=data or {}, state="SUCCESS", logs=logs or [])


def failed(message: str, data: dict[str, Any] | None = None) -> PluginOutput:
    return PluginOutput(data=data or {}, state="FAILED", logs=[message])


def warning(message: str, data: dict[str, Any] | None = None) -> PluginOutput:
    return PluginOutput(data=data or {}, state="WARNING", logs=[message])
```

**Step 4: Write domain/plugins/registry.py**

Port from `pipeline-worker/app/registry.py` — update import paths:

```python
# services/platform-api/app/domain/plugins/registry.py
"""Plugin registry — auto-discovers and maps task_type -> handler."""

import importlib
import inspect
import pkgutil
from typing import Any

from app.domain.plugins.models import BasePlugin

PLUGIN_REGISTRY: dict[str, BasePlugin] = {}
FUNCTION_NAME_MAP: dict[str, str] = {}


def _task_type_to_function_name(task_type: str) -> str:
    if task_type.startswith("blockdata."):
        parts = task_type.split(".")
        return "_".join(parts[1:])

    if task_type.startswith("io.kestra.plugin."):
        parts = task_type.replace("io.kestra.plugin.", "").split(".")
        parts[-1] = parts[-1].lower()
        if len(parts) == 3 and parts[0] == "core" and parts[1] == "flow":
            parts = [parts[0], parts[2]]
        elif len(parts) >= 2 and parts[-1] == parts[-2]:
            parts.pop()
        return "_".join(parts)

    return ""


def discover_plugins() -> None:
    """Scan app/plugins/ for all BasePlugin subclasses and register them."""
    import app.plugins as plugins_pkg

    for _importer, modname, _ispkg in pkgutil.iter_modules(plugins_pkg.__path__):
        module = importlib.import_module(f"app.plugins.{modname}")
        for _name, obj in inspect.getmembers(module, inspect.isclass):
            if issubclass(obj, BasePlugin) and obj is not BasePlugin:
                instance = obj()
                for task_type in instance.task_types:
                    PLUGIN_REGISTRY[task_type] = instance
                if instance.task_types:
                    primary = instance.task_types[0]
                    fn = _task_type_to_function_name(primary)
                    if fn:
                        FUNCTION_NAME_MAP[fn] = primary


def resolve(task_type: str) -> BasePlugin | None:
    return PLUGIN_REGISTRY.get(task_type)


def resolve_by_function_name(function_name: str) -> str | None:
    return FUNCTION_NAME_MAP.get(function_name)


def list_all() -> list[dict[str, Any]]:
    seen: dict[int, dict] = {}
    for task_type, plugin in PLUGIN_REGISTRY.items():
        pid = id(plugin)
        if pid not in seen:
            seen[pid] = {
                "class": plugin.__class__.__name__,
                "task_types": list(plugin.task_types),
                "parameter_schema": plugin.parameter_schema(),
            }
    return list(seen.values())
```

**Step 5: Write domain/plugins/execution.py**

Port from `pipeline-worker/app/shared/runner.py` — identical content with updated module path:

```python
# services/platform-api/app/domain/plugins/execution.py
"""Subprocess runner for script-based plugins."""

import asyncio
import glob as glob_module
import os
import tempfile
from dataclasses import dataclass, field


@dataclass
class RunResult:
    exit_code: int = 0
    stdout: str = ""
    stderr: str = ""
    output_files: dict[str, bytes] = field(default_factory=dict)


async def run_script(
    interpreter: list[str],
    script: str,
    env: dict[str, str] | None = None,
    cwd: str | None = None,
    timeout: float = 300,
    before_commands: list[str] | None = None,
    output_file_patterns: list[str] | None = None,
) -> RunResult:
    full_env = {**os.environ, **(env or {})}
    if before_commands:
        full_script = "\n".join(before_commands) + "\n" + script
    else:
        full_script = script

    work_dir = cwd or tempfile.mkdtemp(prefix="platform-api-")

    try:
        proc = await asyncio.create_subprocess_exec(
            *interpreter,
            full_script,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=full_env,
            cwd=work_dir,
        )
        stdout_bytes, stderr_bytes = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        return RunResult(exit_code=-1, stdout="", stderr=f"Script timed out after {timeout}s")

    result = RunResult(
        exit_code=proc.returncode or 0,
        stdout=stdout_bytes.decode("utf-8", errors="replace"),
        stderr=stderr_bytes.decode("utf-8", errors="replace"),
    )

    if output_file_patterns:
        for pattern in output_file_patterns:
            for filepath in glob_module.glob(os.path.join(work_dir, pattern)):
                with open(filepath, "rb") as f:
                    rel = os.path.relpath(filepath, work_dir)
                    result.output_files[rel] = f.read()

    return result
```

**Step 6: Copy plugin files from pipeline-worker**

```bash
cp services/pipeline-worker/app/plugins/core.py services/platform-api/app/plugins/core.py
cp services/pipeline-worker/app/plugins/http.py services/platform-api/app/plugins/http.py
cp services/pipeline-worker/app/plugins/scripts.py services/platform-api/app/plugins/scripts.py
cp services/pipeline-worker/app/plugins/eyecite.py services/platform-api/app/plugins/eyecite.py
```

Then update imports in each copied plugin file. The actual plugin imports use `from ..shared import output as out` (not direct function imports). Replace per file:

**All plugins (core.py, http.py, scripts.py, eyecite.py):**
- `from ..shared.base import BasePlugin, PluginOutput` → `from app.domain.plugins.models import BasePlugin, PluginOutput`
- `from ..shared import output as out` → `from app.domain.plugins import models as out`

**scripts.py only:**
- `from ..shared.runner import run_script` → `from app.domain.plugins.execution import run_script`

**http.py only:**
- `from ..shared.auth import resolve_credentials` → `from app.infra.auth import resolve_credentials`
- `from ..shared.storage import upload_to_storage, download_from_storage` → `from app.infra.storage import upload_to_storage, download_from_storage`

Also copy the auth resolver (used by HTTP plugin for request auth — BASIC/BEARER/API_KEY):

```bash
cp services/pipeline-worker/app/shared/auth.py services/platform-api/app/infra/auth.py
```

**Step 7: Run test to verify it passes**

Run: `cd services/platform-api && python -m pytest tests/test_plugins.py -v`
Expected: 8 passed

**Step 8: Commit**

```bash
git add services/platform-api/app/domain/plugins/ services/platform-api/app/plugins/ services/platform-api/tests/test_plugins.py services/platform-api/app/infra/auth.py
git commit -m "feat(platform-api): port plugin system with faithful ExecutionContext"
```

---

### Task 6: Extract conversion domain modules

**Files:**
- Create: `services/platform-api/app/domain/conversion/models.py`
- Create: `services/platform-api/app/domain/conversion/service.py`
- Create: `services/platform-api/app/domain/conversion/callbacks.py`
- Test: `services/platform-api/tests/test_conversion.py`

**Step 1: Write the failing test**

```python
# services/platform-api/tests/test_conversion.py
import asyncio
import pytest
from app.domain.conversion.models import ConvertRequest, OutputTarget
from app.domain.conversion.service import resolve_track, convert


def _build_request(track=None, source_type="txt"):
    output = OutputTarget(
        bucket="documents",
        key="converted/source/file.md",
        signed_upload_url="https://example.test/upload",
        token=None,
    )
    return ConvertRequest(
        source_uid="source-uid",
        conversion_job_id="job-uid",
        track=track,
        source_type=source_type,
        source_download_url="https://example.test/source",
        output=output,
        callback_url="https://example.test/callback",
    )


def test_resolve_track_explicit():
    req = _build_request(track="pandoc", source_type="rst")
    assert resolve_track(req) == "pandoc"


def test_resolve_track_legacy():
    assert resolve_track(_build_request(track=None, source_type="txt")) == "mdast"
    assert resolve_track(_build_request(track=None, source_type="docx")) == "docling"


def test_convert_mdast(monkeypatch):
    async def fake_download(_):
        return b"hello"

    # Patch where the name is used, not where it's defined — service.py does
    # `from app.infra.http_client import download_bytes` (direct import)
    monkeypatch.setattr("app.domain.conversion.service.download_bytes", fake_download)

    req = _build_request(track="mdast", source_type="txt")
    md, docling, pandoc, html, doctags = asyncio.run(convert(req))
    assert md == b"hello"
    assert docling is None
    assert pandoc is None
```

**Step 2: Run test to verify it fails**

Run: `cd services/platform-api && python -m pytest tests/test_conversion.py -v`
Expected: FAIL with `ModuleNotFoundError`

**Step 3: Write domain/conversion/models.py**

```python
# services/platform-api/app/domain/conversion/models.py
"""Conversion request/response models."""

from typing import Any, Optional

from pydantic import BaseModel, Field


class OutputTarget(BaseModel):
    bucket: str
    key: str
    signed_upload_url: str
    token: Optional[str] = None


class ConvertRequest(BaseModel):
    source_uid: str
    conversion_job_id: str
    track: Optional[str] = Field(default=None, pattern=r"^(mdast|docling|pandoc)$")
    source_type: str = Field(pattern=r"^(docx|pdf|pptx|xlsx|html|csv|txt|rst|latex|odt|epub|rtf|org)$")
    source_download_url: str
    output: OutputTarget
    docling_output: Optional[OutputTarget] = None
    pandoc_output: Optional[OutputTarget] = None
    html_output: Optional[OutputTarget] = None
    doctags_output: Optional[OutputTarget] = None
    callback_url: str


class CitationsRequest(BaseModel):
    text: str


class CitationResult(BaseModel):
    type: str
    matched_text: str
    span: list[int]
    groups: dict[str, Any]
    metadata: dict[str, Any]
    resource_id: Optional[str] = None
```

**Step 4: Write domain/conversion/service.py**

Port the conversion logic from `conversion-service/app/main.py`, using `app.infra.http_client` for HTTP helpers:

```python
# services/platform-api/app/domain/conversion/service.py
"""Document conversion logic — Docling, Pandoc, mdast tracks."""

import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Optional

from app.domain.conversion.models import ConvertRequest
from app.infra.http_client import download_bytes

SOURCE_SUFFIX_BY_TYPE: dict[str, str] = {
    "docx": ".docx", "pdf": ".pdf", "pptx": ".pptx", "xlsx": ".xlsx",
    "html": ".html", "csv": ".csv", "txt": ".txt", "rst": ".rst",
    "latex": ".tex", "odt": ".odt", "epub": ".epub", "rtf": ".rtf", "org": ".org",
}

PANDOC_READER_BY_SOURCE_TYPE: dict[str, str] = {
    "docx": "docx", "html": "html", "txt": "markdown", "rst": "rst",
    "latex": "latex", "odt": "odt", "epub": "epub", "rtf": "rtf", "org": "org",
}


def resolve_track(req: ConvertRequest) -> str:
    if req.track:
        return req.track
    if req.source_type == "txt":
        return "mdast"
    return "docling"


def _canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _build_docling_converter():
    try:
        from docling.document_converter import DocumentConverter, PdfFormatOption
    except Exception as e:
        raise RuntimeError(f"Docling import failed: {e!r}") from e

    artifacts_path = (os.environ.get("DOCLING_ARTIFACTS_PATH") or "").strip()
    if not artifacts_path:
        return DocumentConverter()

    if not os.path.isdir(artifacts_path):
        raise RuntimeError(f"DOCLING_ARTIFACTS_PATH does not exist: {artifacts_path}")

    try:
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions
    except Exception:
        return DocumentConverter()

    try:
        pipeline_options = PdfPipelineOptions(artifacts_path=artifacts_path)
    except TypeError:
        pipeline_options = PdfPipelineOptions()
        if hasattr(pipeline_options, "artifacts_path"):
            setattr(pipeline_options, "artifacts_path", artifacts_path)
        else:
            return DocumentConverter()

    return DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)},
    )


def _build_docling_json_bytes(doc: Any) -> Optional[bytes]:
    export_to_dict = getattr(doc, "export_to_dict", None)
    if not callable(export_to_dict):
        return None
    return _canonical_json_bytes(export_to_dict())


def _build_docling_html_bytes(doc: Any) -> Optional[bytes]:
    export_to_html = getattr(doc, "export_to_html", None)
    if not callable(export_to_html):
        return None
    html = export_to_html()
    return html.encode("utf-8") if isinstance(html, str) else None


def _build_docling_doctags_bytes(doc: Any) -> Optional[bytes]:
    for method_name in ("export_to_doctags", "export_to_document_tokens"):
        fn = getattr(doc, method_name, None)
        if callable(fn):
            result = fn()
            if isinstance(result, str):
                return result.encode("utf-8")
    return None


def _run_pandoc(input_path: Path, reader: str, writer: str) -> bytes:
    try:
        proc = subprocess.run(
            ["pandoc", "--from", reader, "--to", writer, str(input_path)],
            check=True, capture_output=True,
        )
    except FileNotFoundError as e:
        raise RuntimeError("pandoc binary not found in conversion service image") from e
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"").decode("utf-8", errors="replace")
        raise RuntimeError(f"pandoc conversion failed ({reader}->{writer}): {stderr[:1000]}") from e
    return proc.stdout


def _build_pandoc_ast_bytes_strict(source_type: str, source_bytes: bytes) -> bytes:
    reader = PANDOC_READER_BY_SOURCE_TYPE.get(source_type)
    if not reader:
        raise RuntimeError(f"pandoc track does not support source_type: {source_type}")
    suffix = SOURCE_SUFFIX_BY_TYPE.get(source_type, ".bin")
    with tempfile.TemporaryDirectory(prefix="ws-pandoc-") as tmp_dir:
        input_path = Path(tmp_dir) / f"source{suffix}"
        input_path.write_bytes(source_bytes)
        pandoc_json_raw = _run_pandoc(input_path, reader, "json")
    try:
        ast_obj = json.loads(pandoc_json_raw.decode("utf-8"))
    except Exception as e:
        raise RuntimeError(f"pandoc JSON output is invalid: {e!r}") from e
    return _canonical_json_bytes(ast_obj)


async def _maybe_build_docling_json_bytes(req: ConvertRequest) -> Optional[bytes]:
    try:
        converter = _build_docling_converter()
        result = converter.convert(req.source_download_url)
        return _build_docling_json_bytes(result.document)
    except Exception:
        return None


async def _maybe_build_pandoc_ast_bytes(req: ConvertRequest, source_bytes: Optional[bytes] = None) -> Optional[bytes]:
    if req.source_type not in PANDOC_READER_BY_SOURCE_TYPE:
        return None
    try:
        if source_bytes is None:
            source_bytes = await download_bytes(req.source_download_url)
        return _build_pandoc_ast_bytes_strict(req.source_type, source_bytes)
    except Exception:
        return None


async def convert(
    req: ConvertRequest,
) -> tuple[bytes, Optional[bytes], Optional[bytes], Optional[bytes], Optional[bytes]]:
    """Run the conversion pipeline. Returns (markdown, docling_json, pandoc_json, html, doctags)."""
    track = resolve_track(req)

    if track == "mdast":
        if req.source_type != "txt":
            raise RuntimeError(f"mdast track only supports txt, got: {req.source_type}")
        source_bytes = await download_bytes(req.source_download_url)
        markdown_bytes = source_bytes.decode("utf-8", errors="replace").encode("utf-8")
        docling_json_bytes = await _maybe_build_docling_json_bytes(req) if req.docling_output is not None else None
        pandoc_json_bytes = await _maybe_build_pandoc_ast_bytes(req, source_bytes) if req.pandoc_output is not None else None
        return markdown_bytes, docling_json_bytes, pandoc_json_bytes, None, None

    if track == "docling":
        converter = _build_docling_converter()
        result = converter.convert(req.source_download_url)
        doc = result.document
        markdown_bytes = doc.export_to_markdown().encode("utf-8")
        docling_json_bytes = _build_docling_json_bytes(doc) if req.docling_output is not None else None
        html_bytes = _build_docling_html_bytes(doc) if req.html_output is not None else None
        doctags_bytes = _build_docling_doctags_bytes(doc) if req.doctags_output is not None else None
        pandoc_json_bytes = await _maybe_build_pandoc_ast_bytes(req) if req.pandoc_output is not None else None
        return markdown_bytes, docling_json_bytes, pandoc_json_bytes, html_bytes, doctags_bytes

    if track == "pandoc":
        reader = PANDOC_READER_BY_SOURCE_TYPE.get(req.source_type)
        if not reader:
            raise RuntimeError(f"pandoc track does not support source_type: {req.source_type}")
        source_bytes = await download_bytes(req.source_download_url)
        suffix = SOURCE_SUFFIX_BY_TYPE.get(req.source_type, ".bin")
        with tempfile.TemporaryDirectory(prefix="ws-pandoc-") as tmp_dir:
            input_path = Path(tmp_dir) / f"source{suffix}"
            input_path.write_bytes(source_bytes)
            markdown_bytes = _run_pandoc(input_path, reader, "gfm")
        pandoc_json_bytes = _build_pandoc_ast_bytes_strict(req.source_type, source_bytes)
        docling_json_bytes = await _maybe_build_docling_json_bytes(req) if req.docling_output is not None else None
        return markdown_bytes, docling_json_bytes, pandoc_json_bytes, None, None

    raise RuntimeError(f"Unknown track: {track}")
```

**Step 5: Write domain/conversion/callbacks.py**

```python
# services/platform-api/app/domain/conversion/callbacks.py
"""Conversion callback handling."""

from typing import Any

from app.infra.http_client import post_callback


async def send_conversion_callback(
    callback_url: str,
    shared_secret: str,
    payload: dict[str, Any],
) -> None:
    """Best-effort callback POST."""
    try:
        await post_callback(callback_url, payload, shared_secret)
    except Exception:
        pass  # Best-effort; pg_cron TTL will mark conversion_failed
```

**Step 6: Run test to verify it passes**

Run: `cd services/platform-api && python -m pytest tests/test_conversion.py -v`
Expected: 3 passed

**Step 7: Commit**

```bash
git add services/platform-api/app/domain/conversion/ services/platform-api/tests/test_conversion.py
git commit -m "feat(platform-api): extract conversion domain from monolith"
```

---

### Task 7: Implement conversion isolation with ProcessPoolExecutor

> **NEW TASK:** This was promised in the architecture description of the original plan but never implemented. The `/convert` route called `await convert(body)` directly on the event loop, meaning Docling's CPU-bound work (10-60 seconds) blocks all async handlers. This task implements real isolation with saturation tracking and readiness gating.

**Files:**
- Create: `services/platform-api/app/workers/conversion_pool.py`
- Test: `services/platform-api/tests/test_conversion_pool.py`

**Step 1: Write the failing test**

```python
# services/platform-api/tests/helpers/__init__.py
```

```python
# services/platform-api/tests/helpers/pool_workers.py
"""Top-level picklable worker functions for ProcessPoolExecutor tests.

Must be top-level module functions (not nested/local) so they work
with both fork and spawn multiprocessing contexts.
"""

import time


def worker_sleep_and_return():
    time.sleep(0.1)
    return "done"


def worker_sleep_long():
    time.sleep(0.2)
    return "done"


def worker_return_42():
    return 42


def worker_raise_value_error():
    raise ValueError("conversion failed")
```

```python
# services/platform-api/tests/test_conversion_pool.py
import asyncio
import pytest
from app.workers.conversion_pool import ConversionPool
from tests.helpers.pool_workers import (
    worker_sleep_and_return,
    worker_sleep_long,
    worker_return_42,
    worker_raise_value_error,
)


@pytest.fixture
def pool():
    p = ConversionPool(max_workers=2)
    yield p
    p.shutdown()


def test_pool_initializes_not_saturated(pool):
    assert pool.is_saturated is False
    assert pool.active_count == 0


def test_pool_status(pool):
    status = pool.status()
    assert status["max_workers"] == 2
    assert status["active"] == 0
    assert status["saturated"] is False


def test_pool_tracks_active_count(pool):
    """Verify active count increments during work and decrements after."""
    results = []

    async def run_test():
        fut1 = pool.submit(worker_sleep_and_return)
        fut2 = pool.submit(worker_sleep_and_return)
        await asyncio.sleep(0.01)
        results.append(pool.active_count)
        r1 = await fut1
        r2 = await fut2
        results.append(pool.active_count)
        return r1, r2

    r1, r2 = asyncio.run(run_test())
    assert r1 == "done"
    assert r2 == "done"
    assert results[0] == 2  # both active during work
    assert results[1] == 0  # both done


def test_pool_reports_saturated_when_full():
    pool = ConversionPool(max_workers=1)

    async def run_test():
        fut1 = pool.submit(worker_sleep_long)
        await asyncio.sleep(0.01)
        saturated_during = pool.is_saturated
        await fut1
        saturated_after = pool.is_saturated
        return saturated_during, saturated_after

    during, after = asyncio.run(run_test())
    assert during is True
    assert after is False
    pool.shutdown()


def test_pool_submit_returns_awaitable(pool):
    async def run_test():
        result = await pool.submit(worker_return_42)
        return result

    result = asyncio.run(run_test())
    assert result == 42


def test_pool_propagates_exceptions(pool):
    async def run_test():
        with pytest.raises(ValueError, match="conversion failed"):
            await pool.submit(worker_raise_value_error)

    asyncio.run(run_test())


def test_pool_rejects_when_overloaded():
    """Pool raises PoolOverloaded when active + queued exceeds capacity."""
    from app.workers.conversion_pool import PoolOverloaded
    pool = ConversionPool(max_workers=1, max_queue_depth=1)

    async def run_test():
        # Fill the pool (1 active) and queue (1 queued)
        fut1 = pool.submit(worker_sleep_long)
        fut2 = pool.submit(worker_sleep_long)
        await asyncio.sleep(0.01)
        # Third submission should be rejected
        with pytest.raises(PoolOverloaded):
            pool.submit(worker_return_42)
        await fut1
        await fut2

    asyncio.run(run_test())
    pool.shutdown()
```

**Step 2: Run test to verify it fails**

Run: `cd services/platform-api && python -m pytest tests/test_conversion_pool.py -v`
Expected: FAIL with `ModuleNotFoundError`

**Step 3: Write conversion_pool.py**

```python
# services/platform-api/app/workers/conversion_pool.py
"""ProcessPoolExecutor wrapper for CPU-bound conversion isolation.

Docling document conversion is CPU-bound (10-60 seconds per document).
Running it directly in the async event loop blocks all other handlers.
This module provides a pool that:
1. Offloads conversion to separate processes
2. Tracks active/saturated state for readiness checks
3. Provides an async interface (submit returns an awaitable)
"""

import asyncio
import logging
import multiprocessing
import os
import sys
import threading
from concurrent.futures import ProcessPoolExecutor
from typing import Any, Callable, TypeVar

logger = logging.getLogger("platform-api.conversion-pool")

T = TypeVar("T")


def _get_mp_context():
    """Get multiprocessing context.

    Use 'fork' on Linux (Cloud Run) — child processes inherit the parent's
    loaded Docling models (~2GB), avoiding expensive re-imports.

    On macOS/Windows where fork is unsafe or unavailable, fall back to 'spawn'.
    Each child will re-import Docling, which is slow but correct.
    Set CONVERSION_MAX_WORKERS=0 on non-Linux dev machines to skip pool
    isolation and run conversions inline instead.
    """
    if sys.platform == "linux":
        return multiprocessing.get_context("fork")
    return multiprocessing.get_context("spawn")


class PoolOverloaded(Exception):
    """Raised when the conversion pool cannot accept more work."""
    pass


class ConversionPool:
    """Managed ProcessPoolExecutor with saturation tracking and admission control.

    Admission control prevents unbounded backlog when HTTP concurrency (8)
    exceeds conversion capacity (2 workers). Without it, excess /convert
    requests queue silently behind the two workers while lighter requests
    (health, functions, plugins) still flow — but conversion callers see
    ever-growing latency instead of a clear 503.
    """

    def __init__(self, max_workers: int | None = None, max_queue_depth: int | None = None):
        self._max_workers = max_workers or int(os.environ.get("CONVERSION_MAX_WORKERS", "2"))
        self._max_queue_depth = max_queue_depth if max_queue_depth is not None else int(
            os.environ.get("CONVERSION_MAX_QUEUE_DEPTH", "2")
        )
        mp_context = _get_mp_context()
        self._executor = ProcessPoolExecutor(
            max_workers=self._max_workers,
            mp_context=mp_context,
        )
        self._active = 0
        self._lock = threading.Lock()

    @property
    def active_count(self) -> int:
        with self._lock:
            return self._active

    @property
    def is_saturated(self) -> bool:
        with self._lock:
            return self._active >= self._max_workers

    def status(self) -> dict[str, Any]:
        with self._lock:
            return {
                "max_workers": self._max_workers,
                "max_queue_depth": self._max_queue_depth,
                "active": self._active,
                "saturated": self._active >= self._max_workers,
            }

    def submit(self, fn: Callable[..., T], *args: Any, **kwargs: Any) -> asyncio.Future:
        """Submit a callable to the process pool. Returns an awaitable future.

        Raises PoolOverloaded if active count has reached max_workers + max_queue_depth.
        The future resolves when the process completes. Exceptions propagate.
        """
        with self._lock:
            capacity = self._max_workers + self._max_queue_depth
            if self._active >= capacity:
                raise PoolOverloaded(
                    f"Conversion pool at capacity ({self._active}/{capacity}). "
                    "Try again shortly."
                )
            self._active += 1

        loop = asyncio.get_running_loop()
        future = loop.run_in_executor(self._executor, fn, *args)

        def _on_done(fut: asyncio.Future) -> None:
            with self._lock:
                self._active -= 1

        future.add_done_callback(_on_done)
        return future

    def shutdown(self, wait: bool = True) -> None:
        self._executor.shutdown(wait=wait)


# Module-level singleton, initialized in app lifespan
_pool: ConversionPool | None = None


def get_conversion_pool() -> ConversionPool:
    """Get the module-level conversion pool singleton."""
    global _pool
    if _pool is None:
        _pool = ConversionPool()
    return _pool


def init_pool(max_workers: int | None = None) -> ConversionPool:
    """Initialize the module-level pool. Called from app lifespan."""
    global _pool
    _pool = ConversionPool(max_workers=max_workers)
    logger.info(f"Conversion pool initialized with {_pool._max_workers} workers")
    return _pool


def shutdown_pool() -> None:
    """Shutdown the module-level pool. Called from app lifespan."""
    global _pool
    if _pool:
        _pool.shutdown(wait=True)
        _pool = None
```

**Step 4: Run test to verify it passes**

Run: `cd services/platform-api && python -m pytest tests/test_conversion_pool.py -v`
Expected: 6 passed

**Step 5: Commit**

```bash
git add services/platform-api/app/workers/conversion_pool.py services/platform-api/tests/test_conversion_pool.py
git commit -m "feat(platform-api): add ProcessPoolExecutor for conversion isolation"
```

---

### Task 8: Create route modules

**Files:**
- Create: `services/platform-api/app/api/routes/health.py`
- Create: `services/platform-api/app/api/routes/conversion.py`
- Create: `services/platform-api/app/api/routes/functions.py`
- Create: `services/platform-api/app/api/routes/plugin_execution.py`
- Copy+modify: `services/platform-api/app/api/routes/admin_services.py`
- Create: `services/platform-api/app/api/routes/crews.py` (stub)
- Create: `services/platform-api/app/api/routes/embeddings.py` (stub)
- Create: `services/platform-api/app/api/routes/jobs.py` (stub)
- Test: `services/platform-api/tests/test_routes.py`

**Step 1: Write the failing test**

```python
# services/platform-api/tests/test_routes.py
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")

    from app.core.config import get_settings
    get_settings.cache_clear()

    from app.main import create_app
    app = create_app()
    yield TestClient(app)

    get_settings.cache_clear()


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert "status" in resp.json()


def test_health_live(client):
    resp = client.get("/health/live")
    assert resp.status_code == 200


def test_health_ready(client):
    resp = client.get("/health/ready")
    assert resp.status_code == 200
    body = resp.json()
    assert "status" in body
    # Readiness should reflect conversion pool state
    assert "conversion_pool" in body


def test_functions(client):
    resp = client.get("/functions")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_convert_rejects_no_auth(client):
    resp = client.post("/convert", json={})
    assert resp.status_code == 401


def test_citations_rejects_no_auth(client):
    resp = client.post("/citations", json={"text": "hello"})
    assert resp.status_code == 401


def test_convert_route_not_swallowed_by_plugin_catchall(client):
    """Ensure /convert is handled by conversion router, not /{function_name}."""
    resp = client.post("/convert", json={}, headers={"X-Conversion-Service-Key": "test-key"})
    # Should get 422 (validation error for missing fields), not 404 (no plugin)
    assert resp.status_code == 422


def test_unknown_plugin_returns_404(client):
    resp = client.post(
        "/nonexistent_plugin_xyz",
        json={"params": {}},
        headers={"X-Conversion-Service-Key": "test-key"},
    )
    assert resp.status_code == 404


def test_plugin_rejects_no_auth(client):
    """POST /{function_name} requires authentication."""
    resp = client.post("/core_log", json={"params": {"message": "test"}})
    assert resp.status_code == 401


def test_plugin_accepts_m2m_bearer(client):
    """POST /{function_name} accepts M2M bearer token."""
    resp = client.post(
        "/core_log",
        json={"params": {"message": "test"}},
        headers={"Authorization": "Bearer test-key"},
    )
    # Should succeed (200) or at least not 401/403
    assert resp.status_code == 200


def test_plugin_rejects_bad_token(client):
    """POST /{function_name} rejects invalid bearer token."""
    resp = client.post(
        "/core_log",
        json={"params": {"message": "test"}},
        headers={"Authorization": "Bearer wrong-token"},
    )
    assert resp.status_code == 401


def test_convert_returns_503_when_pool_overloaded(client, monkeypatch):
    """POST /convert returns 503 with Retry-After when pool is at capacity."""
    from app.workers.conversion_pool import PoolOverloaded
    from unittest.mock import patch

    def mock_submit(*args, **kwargs):
        raise PoolOverloaded("at capacity")

    with patch("app.api.routes.conversion.get_conversion_pool") as mock_pool:
        pool_instance = mock_pool.return_value
        pool_instance.submit.side_effect = mock_submit
        pool_instance._max_workers = 2

        resp = client.post(
            "/convert",
            json={
                "source_uid": "src-1",
                "conversion_job_id": "job-1",
                "track": "docling",
                "source_type": "pdf",
                "source_download_url": "https://example.test/file.pdf",
                "output": {
                    "bucket": "documents",
                    "key": "out/file.md",
                    "signed_upload_url": "https://example.test/upload",
                },
                "callback_url": "https://example.test/callback",
            },
            headers={"X-Conversion-Service-Key": "test-key"},
        )
        assert resp.status_code == 503
        assert "Retry-After" in resp.headers


def test_api_v1_crews_stub(client):
    resp = client.get("/api/v1/crews")
    assert resp.status_code == 501


def test_api_v1_embeddings_stub(client):
    resp = client.get("/api/v1/embeddings")
    assert resp.status_code == 501


def test_api_v1_jobs_stub(client):
    resp = client.get("/api/v1/jobs")
    assert resp.status_code == 501
```

**Step 2: Run test to verify it fails**

Run: `cd services/platform-api && python -m pytest tests/test_routes.py -v`
Expected: FAIL with `ModuleNotFoundError`

**Step 3: Write health.py**

> **CHANGED FROM ORIGINAL:** Readiness endpoint now reports conversion pool status instead of always returning "ready".

```python
# services/platform-api/app/api/routes/health.py
from fastapi import APIRouter

from app.domain.plugins.registry import FUNCTION_NAME_MAP
from app.workers.conversion_pool import get_conversion_pool

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok", "functions": len(FUNCTION_NAME_MAP)}


@router.get("/health/live")
async def health_live():
    return {"status": "alive"}


@router.get("/health/ready")
async def health_ready():
    """Readiness probe — reports conversion pool saturation.

    Returns 200 always (Cloud Run uses this for routing, not rejection),
    but includes pool state so load balancers and monitoring can act on it.
    """
    pool = get_conversion_pool()
    pool_status = pool.status()
    return {
        "status": "ready" if not pool_status["saturated"] else "saturated",
        "conversion_pool": pool_status,
    }
```

**Step 4: Write conversion.py route**

> **CHANGED FROM ORIGINAL:** Conversion route now uses the ProcessPoolExecutor for Docling/Pandoc tracks instead of calling `await convert(body)` directly on the event loop. The mdast track (plain text passthrough) remains inline since it's not CPU-bound.

```python
# services/platform-api/app/api/routes/conversion.py
import asyncio
import os
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header

from app.auth.dependencies import require_auth
from app.auth.principals import AuthPrincipal
from app.domain.conversion.models import ConvertRequest, CitationsRequest
from app.domain.conversion.service import convert, resolve_track
from app.domain.conversion.callbacks import send_conversion_callback
from app.infra.http_client import upload_bytes, append_token_if_needed
from app.workers.conversion_pool import get_conversion_pool, PoolOverloaded

from eyecite import get_citations, resolve_citations

router = APIRouter(tags=["conversion"])


def _serialize_citation(c: Any) -> dict[str, Any]:
    meta = c.metadata
    meta_dict: dict[str, Any] = {}
    for field in meta.__dataclass_fields__:
        val = getattr(meta, field, None)
        if val is not None:
            meta_dict[field] = val
    return {
        "type": type(c).__name__,
        "matched_text": c.matched_text(),
        "span": list(c.span()),
        "groups": dict(c.groups),
        "metadata": meta_dict,
    }


def _run_convert_in_process(req_dict: dict) -> tuple:
    """Top-level function for ProcessPoolExecutor (must be picklable).

    Reconstructs the ConvertRequest from dict, runs the sync-heavy conversion,
    and returns the result tuple.
    """
    import asyncio
    from app.domain.conversion.models import ConvertRequest
    from app.domain.conversion.service import convert

    req = ConvertRequest(**req_dict)
    return asyncio.run(convert(req))


@router.post("/convert")
async def convert_route(
    body: ConvertRequest,
    auth: AuthPrincipal = Depends(require_auth),
):
    shared_secret = os.environ.get("CONVERSION_SERVICE_KEY", "")
    track = resolve_track(body)

    # Admission control: check capacity BEFORE entering the try/finally callback block.
    # If we reject here, no callback fires — the job was never accepted.
    pool = get_conversion_pool()
    use_pool = track in ("docling", "pandoc") and pool._max_workers > 0
    if use_pool:
        try:
            pool_status = pool.status()
            capacity = pool_status["max_workers"] + pool_status["max_queue_depth"]
            if pool_status["active"] >= capacity:
                from fastapi.responses import JSONResponse
                return JSONResponse(
                    status_code=503,
                    content={"detail": "Conversion pool at capacity. Try again shortly."},
                    headers={"Retry-After": "15"},
                )
        except PoolOverloaded:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=503,
                content={"detail": "Conversion pool at capacity. Try again shortly."},
                headers={"Retry-After": "15"},
            )

    callback_payload: dict[str, Any] = {
        "source_uid": body.source_uid,
        "conversion_job_id": body.conversion_job_id,
        "track": track,
        "md_key": body.output.key,
        "docling_key": None,
        "pandoc_key": None,
        "html_key": None,
        "doctags_key": None,
        "success": False,
        "error": None,
    }

    try:
        # Docling and Pandoc tracks are CPU-bound — offload to process pool.
        # mdast (plain text passthrough) stays inline since it's just a decode.
        if use_pool:
            markdown_bytes, docling_json_bytes, pandoc_json_bytes, html_bytes, doctags_bytes = (
                await pool.submit(_run_convert_in_process, body.model_dump())
            )
        else:
            markdown_bytes, docling_json_bytes, pandoc_json_bytes, html_bytes, doctags_bytes = await convert(body)

        md_url = append_token_if_needed(body.output.signed_upload_url, body.output.token)
        await upload_bytes(md_url, markdown_bytes, "text/markdown; charset=utf-8")

        if body.docling_output and docling_json_bytes:
            url = append_token_if_needed(body.docling_output.signed_upload_url, body.docling_output.token)
            await upload_bytes(url, docling_json_bytes, "application/json; charset=utf-8")
            callback_payload["docling_key"] = body.docling_output.key

        if body.pandoc_output and pandoc_json_bytes:
            url = append_token_if_needed(body.pandoc_output.signed_upload_url, body.pandoc_output.token)
            await upload_bytes(url, pandoc_json_bytes, "application/json; charset=utf-8")
            callback_payload["pandoc_key"] = body.pandoc_output.key

        if body.html_output and html_bytes:
            url = append_token_if_needed(body.html_output.signed_upload_url, body.html_output.token)
            await upload_bytes(url, html_bytes, "text/html")
            callback_payload["html_key"] = body.html_output.key

        if body.doctags_output and doctags_bytes:
            url = append_token_if_needed(body.doctags_output.signed_upload_url, body.doctags_output.token)
            await upload_bytes(url, doctags_bytes, "text/plain; charset=utf-8")
            callback_payload["doctags_key"] = body.doctags_output.key

        callback_payload["success"] = True
    except Exception as e:
        callback_payload["success"] = False
        callback_payload["error"] = str(e)[:1000]
    finally:
        await send_conversion_callback(body.callback_url, shared_secret, callback_payload)

    return {"ok": True}


@router.post("/citations")
async def citations_route(
    body: CitationsRequest,
    auth: AuthPrincipal = Depends(require_auth),
):
    cites = get_citations(body.text, remove_ambiguous=False)
    resolutions = resolve_citations(cites)

    results = []
    cite_to_resource: dict[int, int] = {}
    resources = []
    for i, (resource, members) in enumerate(resolutions.items()):
        resources.append({
            "id": i,
            "anchor": _serialize_citation(resource.citation),
            "count": len(members),
        })
        for m in members:
            cite_to_resource[id(m)] = i

    for c in cites:
        entry = _serialize_citation(c)
        entry["resource_id"] = cite_to_resource.get(id(c))
        results.append(entry)

    return {"citations": results, "resources": resources, "total": len(results)}
```

**Step 5: Write functions.py route**

```python
# services/platform-api/app/api/routes/functions.py
from fastapi import APIRouter

from app.domain.plugins.registry import FUNCTION_NAME_MAP, resolve

router = APIRouter(tags=["functions"])


@router.get("/functions")
async def list_functions():
    return [
        {
            "function_name": fn,
            "path": f"/{fn}",
            "method": "POST",
            "task_type": tt,
            "parameter_schema": resolve(tt).parameter_schema() if resolve(tt) else [],
        }
        for fn, tt in sorted(FUNCTION_NAME_MAP.items())
    ]
```

**Step 6: Write plugin_execution.py route**

```python
# services/platform-api/app/api/routes/plugin_execution.py
import logging
import traceback
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import require_auth
from app.auth.principals import AuthPrincipal
from app.domain.plugins.models import PluginOutput, ExecutionContext
from app.domain.plugins.registry import resolve, resolve_by_function_name

logger = logging.getLogger("platform-api")

router = APIRouter(tags=["plugins"])


class PluginRequest(BaseModel):
    params: dict[str, Any] = {}
    execution_id: str = ""
    task_run_id: str = ""
    variables: dict[str, Any] = {}


class PluginResponse(BaseModel):
    function_name: str
    output: PluginOutput


@router.post("/{function_name}")
async def execute(
    function_name: str,
    request: PluginRequest,
    auth: AuthPrincipal = Depends(require_auth),
) -> PluginResponse:
    task_type = resolve_by_function_name(function_name)
    if not task_type:
        raise HTTPException(404, f"No handler for function: {function_name}")

    plugin = resolve(task_type)
    if not plugin:
        raise HTTPException(404, f"No handler for task type: {task_type}")

    context = ExecutionContext(
        execution_id=request.execution_id,
        task_run_id=request.task_run_id,
        variables=request.variables,
    )

    try:
        result = await plugin.run(request.params, context)
    except Exception as e:
        logger.error(f"Plugin {function_name} failed: {e}\n{traceback.format_exc()}")
        result = PluginOutput(state="FAILED", logs=[str(e)])

    return PluginResponse(function_name=function_name, output=result)
```

**Step 7: Port admin_services.py**

```bash
cp services/pipeline-worker/app/routes/admin_services.py services/platform-api/app/api/routes/admin_services.py
```

Update imports in the copied file:
- `from ..shared.supabase_client import get_supabase_admin` → `from app.infra.supabase_client import get_supabase_admin`
- `from ..shared.superuser import SuperuserContext, require_superuser` → `from app.auth.dependencies import SuperuserContext, require_superuser`

**Step 8: Write stub routers for future modules**

```python
# services/platform-api/app/api/routes/crews.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/v1", tags=["crews"])


@router.get("/crews")
async def list_crews():
    return JSONResponse(status_code=501, content={"detail": "Not implemented"})
```

```python
# services/platform-api/app/api/routes/embeddings.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/v1", tags=["embeddings"])


@router.get("/embeddings")
async def list_embeddings():
    return JSONResponse(status_code=501, content={"detail": "Not implemented"})
```

```python
# services/platform-api/app/api/routes/jobs.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/v1", tags=["jobs"])


@router.get("/jobs")
async def list_jobs():
    return JSONResponse(status_code=501, content={"detail": "Not implemented"})
```

**Step 9: Commit**

```bash
git add services/platform-api/app/api/ services/platform-api/tests/test_routes.py
git commit -m "feat(platform-api): add all route modules with correct mounting order"
```

---

### Task 9: Create main.py with correct route ordering

> **CHANGED FROM ORIGINAL:** Lifespan now initializes and shuts down the conversion pool.

**Files:**
- Create: `services/platform-api/app/main.py`

**Step 1: Write main.py**

```python
# services/platform-api/app/main.py
"""Platform API — unified FastAPI service for BlockData."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.domain.plugins.registry import discover_plugins, FUNCTION_NAME_MAP
from app.core.reserved_routes import check_collisions
from app.workers.conversion_pool import init_pool, shutdown_pool

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("platform-api")


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        discover_plugins()
        check_collisions(set(FUNCTION_NAME_MAP.keys()))
        count = len(FUNCTION_NAME_MAP)
        logger.info(f"Discovered {count} plugin functions. Collision check passed.")

        # Initialize conversion process pool
        pool = init_pool()
        logger.info(f"Conversion pool: {pool.status()}")

        yield

        # Shutdown conversion pool gracefully
        shutdown_pool()
        logger.info("Conversion pool shut down.")

    app = FastAPI(title="Platform API", lifespan=lifespan)

    # Auth middleware for /convert and /citations — runs BEFORE body parsing
    from app.auth.middleware import AuthBeforeBodyMiddleware
    app.add_middleware(AuthBeforeBodyMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Route mounting order matters! ---
    # 1. Health routes (no auth)
    from app.api.routes.health import router as health_router
    app.include_router(health_router)

    # 2. Conversion and citations (middleware handles pre-body auth,
    #    Depends(require_auth) still runs for JWT validation + role assignment)
    from app.api.routes.conversion import router as conversion_router
    app.include_router(conversion_router)

    # 3. Admin routes (platform_admin role required)
    from app.api.routes.admin_services import router as admin_router
    app.include_router(admin_router)

    # 4. Future /api/v1/* routes (stubs)
    from app.api.routes.crews import router as crews_router
    from app.api.routes.embeddings import router as embeddings_router
    from app.api.routes.jobs import router as jobs_router
    app.include_router(crews_router)
    app.include_router(embeddings_router)
    app.include_router(jobs_router)

    # 5. Functions listing
    from app.api.routes.functions import router as functions_router
    app.include_router(functions_router)

    # 6. Plugin catch-all MUST be last
    from app.api.routes.plugin_execution import router as plugin_router
    app.include_router(plugin_router)

    return app


app = create_app()
```

**Step 2: Run all tests**

Run: `cd services/platform-api && python -m pytest tests/ -v`
Expected: All tests pass (reserved routes, auth, conversion, plugins, conversion pool, routes)

**Step 3: Commit**

```bash
git add services/platform-api/app/main.py
git commit -m "feat(platform-api): create main.py with route ordering and conversion pool lifecycle"
```

---

### Task 10: Create Dockerfile

> **Note:** `requirements.txt` and `pyproject.toml` were created in Task 1.

**Files:**
- Create: `services/platform-api/Dockerfile`
- Copy: `services/platform-api/warmup.py` (from conversion-service)

**Step 1: Copy warmup.py**

```bash
cp services/conversion-service/warmup.py services/platform-api/warmup.py
```

**Step 2: Write Dockerfile (merged from both)**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System deps from both services
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl \
    libxcb1 libx11-6 libxext6 libxrender1 libsm6 \
    libglib2.0-0 libgl1 libgomp1 \
    pandoc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Docling model downloads
RUN docling-tools models download

COPY warmup.py /tmp/warmup.py
RUN python /tmp/warmup.py ; rm /tmp/warmup.py

# RapidOCR assets
RUN mkdir -p /root/.cache/docling/models/RapidOcr/torch/PP-OCRv4/det \
    /root/.cache/docling/models/RapidOcr/torch/PP-OCRv4/cls \
    /root/.cache/docling/models/RapidOcr/torch/PP-OCRv4/rec \
    /root/.cache/docling/models/RapidOcr/paddle/PP-OCRv4/rec/ch_PP-OCRv4_rec_infer \
    /root/.cache/docling/models/RapidOcr/fonts && \
    cp /usr/local/lib/python3.11/site-packages/rapidocr/models/ch_PP-OCRv4_det_infer.pth \
      /root/.cache/docling/models/RapidOcr/torch/PP-OCRv4/det/ && \
    cp /usr/local/lib/python3.11/site-packages/rapidocr/models/ch_ptocr_mobile_v2.0_cls_infer.pth \
      /root/.cache/docling/models/RapidOcr/torch/PP-OCRv4/cls/ && \
    cp /usr/local/lib/python3.11/site-packages/rapidocr/models/ch_PP-OCRv4_rec_infer.pth \
      /root/.cache/docling/models/RapidOcr/torch/PP-OCRv4/rec/ && \
    cp /usr/local/lib/python3.11/site-packages/rapidocr/models/ppocr_keys_v1.txt \
      /root/.cache/docling/models/RapidOcr/paddle/PP-OCRv4/rec/ch_PP-OCRv4_rec_infer/ && \
    (cp /usr/local/lib/python3.11/site-packages/rapidocr/fonts/FZYTK.TTF \
      /root/.cache/docling/models/RapidOcr/fonts/ || \
     cp /usr/local/lib/python3.11/site-packages/rapidocr/models/FZYTK.TTF \
      /root/.cache/docling/models/RapidOcr/fonts/ || true)

COPY app /app/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 4: Commit**

```bash
git add services/platform-api/Dockerfile services/platform-api/warmup.py
git commit -m "feat(platform-api): add Dockerfile and warmup"
```

---

### Task 11: Create deploy script with explicit Cloud Run config

> **CHANGED FROM ORIGINAL:** Deploy script now explicitly sets concurrency=8 (was 1 for conversion-service) since the ProcessPoolExecutor handles Docling isolation. Includes `CONVERSION_MAX_WORKERS` env var to control pool size independently.

**Files:**
- Create: `scripts/deploy-cloud-run-platform-api.ps1`

**Step 1: Copy and modify deploy script**

```bash
cp scripts/deploy-cloud-run-conversion-service.ps1 scripts/deploy-cloud-run-platform-api.ps1
```

Update the copy:
- `$ServiceName` default: `'blockdata-platform-api'`
- `$ServiceAccountName` default: `'blockdata-platform-api-sa'`
- `$Memory` default: `'4Gi'`
- `$Cpu` default: `'2'`
- `$Concurrency` default: `8` (was 1 — safe now because Docling runs in ProcessPoolExecutor, not the event loop)
- `$Timeout` default: `'1800'` (30 min — preserve existing conversion timeout)
- Source path: `'services/platform-api'` (was `'services/conversion-service'`)
- Secret name: `'platform-api-m2m-token'` (was `'conversion-service-key'`)
- Env vars: add `PLATFORM_API_M2M_TOKEN` alongside existing `CONVERSION_SERVICE_KEY` for backward compat
- Env vars: add `CONVERSION_MAX_WORKERS=2` to control ProcessPoolExecutor size

**Step 2: Commit**

```bash
git add scripts/deploy-cloud-run-platform-api.ps1
git commit -m "feat: add platform-api Cloud Run deploy script"
```

---

### Task 12: Run full test suite and verify

**Step 1: Run all tests**

```bash
cd services/platform-api && python -m pytest tests/ -v --tb=short
```

Expected: All tests pass.

**Step 2: Verify route precedence manually**

```bash
cd services/platform-api && python -c "
from app.main import create_app
app = create_app()
routes = [(r.path, r.methods) for r in app.routes if hasattr(r, 'path')]
for path, methods in sorted(routes):
    print(f'{methods} {path}')
"
```

Expected output should show `/convert`, `/citations`, `/health`, `/functions`, `/admin/services/*`, `/api/v1/*` BEFORE `/{function_name}`.

**Step 3: Commit final verification**

```bash
git add -A services/platform-api/
git commit -m "chore(platform-api): verify full test suite passes"
```

---

### Task 13: Migration — dual-run, registry, edge functions, rollback

> **NEW TASK:** The original plan had a thin migration checklist. This task provides the full operational playbook: dual-run period, registry record migration, edge function URL updates, Kestra updates, and rollback procedure.

**This is an operational task, not a code task.** Steps are ordered for zero-downtime cutover.

#### Phase 1: Deploy platform-api alongside existing services (dual-run)

**Step 1: Deploy platform-api to Cloud Run**

```bash
./scripts/deploy-cloud-run-platform-api.ps1
```

Expected: platform-api is running at its own Cloud Run URL. Old services are untouched.

**Step 2: Smoke test platform-api in isolation**

```bash
# Health checks
curl https://<platform-api-url>/health
curl https://<platform-api-url>/health/live
curl https://<platform-api-url>/health/ready

# Functions listing (should match pipeline-worker)
curl https://<platform-api-url>/functions

# Auth — legacy header
curl -X POST https://<platform-api-url>/citations \
  -H "X-Conversion-Service-Key: $CONVERSION_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "See Smith v. Jones, 123 F.3d 456 (9th Cir. 2020)."}'

# Auth — M2M bearer
curl -X POST https://<platform-api-url>/citations \
  -H "Authorization: Bearer $PLATFORM_API_M2M_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "See Smith v. Jones, 123 F.3d 456 (9th Cir. 2020)."}'

# Plugin execution (requires M2M bearer auth)
curl -X POST https://<platform-api-url>/eyecite_clean \
  -H "Authorization: Bearer $PLATFORM_API_M2M_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"params": {"text": "<p>Hello world</p>"}}'

# Conversion pool readiness
curl https://<platform-api-url>/health/ready
```

Expected: All responses match existing service behavior.

**Step 3: Verify conversion with a real document**

Send a real `POST /convert` request with a test PDF/DOCX. Verify:
- Callback fires to the test callback URL
- Artifacts appear in Supabase Storage
- Response matches existing conversion-service format

#### Phase 2: Registry record migration

**Step 4: Update registry_services records**

The `registry_services` table has `base_url` values pointing to existing services. These need to point to platform-api.

```sql
-- Check current state
SELECT service_id, service_name, base_url FROM registry_services;

-- Update base_url for pipeline-worker services
UPDATE registry_services
SET base_url = 'https://<platform-api-url>'
WHERE base_url LIKE '%pipeline-worker%';

-- If conversion-service has registry entries, update those too
UPDATE registry_services
SET base_url = 'https://<platform-api-url>'
WHERE base_url LIKE '%conversion-service%';
```

#### Phase 3: Cut over external callers

**Step 5: Update Supabase edge function environment variables**

These edge functions reference `CONVERSION_SERVICE_URL`:
- `supabase/functions/ingest/process-convert.ts`
- `supabase/functions/_shared/citations.ts`
- `supabase/functions/conversion-complete/index.ts`
- `supabase/functions/trigger-parse/index.ts`

Update via Supabase dashboard or CLI:

```bash
# Set new URL (keep old key working via backward compat)
supabase secrets set CONVERSION_SERVICE_URL=https://<platform-api-url>
```

Note: `CONVERSION_SERVICE_KEY` does NOT need to change — platform-api accepts the same key via legacy header auth.

**Step 6: Update Kestra workflow base URLs**

Update any Kestra workflow definitions that reference the pipeline-worker URL to use the platform-api URL instead.

**Step 7: Verify end-to-end**

- Upload a document through the frontend → verify full pipeline works
- Run a Kestra workflow that calls a plugin → verify it works
- Check Supabase logs for any auth failures

#### Phase 4: Monitor and decommission

**Step 8: Monitor dual-run period (24-48 hours)**

During dual-run, both old services and platform-api should be running. Monitor:
- Cloud Run logs for platform-api — watch for errors
- Cloud Run logs for old services — should show decreasing traffic to zero
- Supabase edge function logs — watch for callback failures

**Step 9: Decommission old services**

Only after dual-run period with zero traffic to old services:

```bash
# Scale old services to zero (keeps them available for rollback)
gcloud run services update blockdata-conversion-service --min-instances 0 --max-instances 0
gcloud run services update blockdata-pipeline-worker --min-instances 0 --max-instances 0
```

Wait another 24 hours, then delete if no issues:

```bash
gcloud run services delete blockdata-conversion-service
gcloud run services delete blockdata-pipeline-worker
```

#### Rollback procedure

If platform-api has issues during dual-run:

1. **Revert edge function env vars:**
   ```bash
   supabase secrets set CONVERSION_SERVICE_URL=https://<old-conversion-service-url>
   ```

2. **Revert registry records:**
   ```sql
   UPDATE registry_services
   SET base_url = 'https://<old-pipeline-worker-url>'
   WHERE base_url LIKE '%platform-api%';
   ```

3. **Revert Kestra workflows** to old pipeline-worker URL.

4. Old services are still running (we scaled them down but didn't delete them). They'll pick up traffic immediately.

5. **Investigate and fix** the platform-api issue, then re-attempt cutover.

---

## Summary

| Task | What it does | Files created | Status vs original |
|------|-------------|---------------|----|
| 1 | Scaffold + deps | `__init__.py` files, `requirements.txt`, `pyproject.toml`, `conftest.py` | **Updated** — deps moved here so tests run from Task 2 |
| 2 | Core config + collision check | `core/config.py`, `core/reserved_routes.py` | Unchanged |
| 3 | Unified auth | `auth/principals.py`, `auth/dependencies.py`, `auth/middleware.py` | **Rewritten** — JWT + superuser + middleware + user_id alias |
| 4 | Infrastructure modules | `infra/supabase_client.py`, `infra/storage.py`, `infra/http_client.py` | Unchanged |
| 5 | Plugin system | `domain/plugins/models.py`, `registry.py`, `execution.py`, `plugins/*.py` | **Rewritten** — faithful ExecutionContext with real storage |
| 6 | Conversion domain | `domain/conversion/models.py`, `service.py`, `callbacks.py` | Unchanged |
| 7 | Conversion isolation | `workers/conversion_pool.py` | **New** — ProcessPoolExecutor with fork context + saturation tracking |
| 8 | Route modules | `api/routes/{health,conversion,functions,plugin_execution,admin_services,crews,embeddings,jobs}.py` | **Updated** — readiness uses pool status, convert uses pool |
| 9 | Main app | `main.py` with correct route order | **Updated** — pool lifecycle + auth middleware in lifespan |
| 10 | Dockerfile | `Dockerfile`, `warmup.py` | **Updated** — requirements.txt moved to Task 1 |
| 11 | Deploy script | `scripts/deploy-cloud-run-platform-api.ps1` | **Updated** — explicit concurrency=8, CONVERSION_MAX_WORKERS |
| 12 | Verification | Full test suite run | Unchanged |
| 13 | Migration playbook | Operational steps (not code) | **New** — dual-run, registry migration, edge function updates, rollback |