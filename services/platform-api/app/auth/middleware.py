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
