from __future__ import annotations

import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from opentelemetry import metrics, trace
from pydantic import BaseModel, Field

from app.auth.dependencies import require_superuser
from app.core.config import get_settings
from app.infra.supabase_client import get_supabase_admin

Provider = Literal["google", "github"]
OAuthAttemptEvent = Literal[
    "callback_received",
    "session_detected",
    "profile_missing",
    "profile_present",
    "completed",
    "failed",
]
OAuthResult = Literal["welcome", "app", "login_error"]
FailureCategory = Literal[
    "provider_disabled",
    "callback_error",
    "no_session",
    "profile_lookup_failed",
    "unexpected",
]
ProfileState = Literal["missing", "present"]

router = APIRouter(tags=["auth-oauth"])
logger = logging.getLogger("auth-oauth")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)
oauth_attempts_counter = meter.create_counter("platform.auth.oauth.attempts.count")
oauth_failures_counter = meter.create_counter("platform.auth.oauth.failures.count")
oauth_attempt_duration_ms = meter.create_histogram("platform.auth.oauth.attempt.duration_ms")
ATTEMPT_TTL_MINUTES = 30


class CreateOAuthAttemptRequest(BaseModel):
    provider: Provider
    redirect_origin: str = Field(min_length=1)
    next_path: str | None = None


class OAuthAttemptEventRequest(BaseModel):
    attempt_secret: str = Field(min_length=1)
    event: OAuthAttemptEvent
    result: OAuthResult | None = None
    failure_category: FailureCategory | None = None
    callback_error_code: str | None = None
    profile_state: ProfileState | None = None
    http_status_code: int | None = Field(default=None, ge=100, le=599)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _generate_attempt_secret() -> str:
    return secrets.token_urlsafe(32)


def _hash_attempt_secret(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _verify_attempt_secret(provided: str, expected_hash: str) -> bool:
    return secrets.compare_digest(_hash_attempt_secret(provided), expected_hash)


def _insert_oauth_attempt(admin, payload: dict) -> dict:
    result = admin.table("auth_oauth_attempts").insert(payload).execute()
    rows = result.data or []
    if not rows:
        raise RuntimeError("Failed to insert auth_oauth_attempt")
    return rows[0]


def _load_oauth_attempt(admin, attempt_id: str) -> dict | None:
    result = (
        admin.table("auth_oauth_attempts")
        .select("*")
        .eq("attempt_id", attempt_id)
        .maybe_single()
        .execute()
    )
    return result.data


def _update_oauth_attempt(admin, attempt_id: str, updates: dict) -> dict:
    payload = {
        **updates,
        "updated_at": _utc_now().isoformat(),
    }
    result = (
        admin.table("auth_oauth_attempts")
        .update(payload)
        .eq("attempt_id", attempt_id)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise RuntimeError(f"OAuth attempt not found for update: {attempt_id}")
    return rows[0]


def _is_attempt_expired(row: dict) -> bool:
    expires_at = row.get("expires_at")
    if not expires_at:
        return False
    if isinstance(expires_at, datetime):
        parsed = expires_at
    else:
        parsed = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed <= _utc_now()


def _calculate_duration_ms(_row: dict) -> int | None:
    created_at = _parse_timestamp(_row.get("created_at"))
    finalized_at = _parse_timestamp(_row.get("finalized_at"))
    if created_at is None or finalized_at is None:
        return None
    delta = finalized_at - created_at
    return max(0, int(delta.total_seconds() * 1000))


def _fetch_supabase_auth_config(settings) -> dict:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=500, detail="Supabase auth configuration is unavailable")

    import httpx

    response = httpx.get(
        f"{settings.supabase_url.rstrip('/')}/auth/v1/settings",
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        },
        timeout=10.0,
    )
    response.raise_for_status()
    return response.json()


def _list_recent_oauth_attempts(admin, limit: int) -> list[dict]:
    result = (
        admin.table("auth_oauth_attempts")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def _parse_timestamp(value: object) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def _is_origin_allowed(settings, redirect_origin: str) -> bool:
    origins = _expected_redirect_origins(settings)
    if not origins:
        return True
    return redirect_origin in origins


def _expected_redirect_origins(settings) -> tuple[str, ...]:
    if settings.auth_redirect_origins:
        return settings.auth_redirect_origins

    raw = os.environ.get("AUTH_REDIRECT_ORIGINS", "")
    if not raw:
        return ()
    return tuple(part.strip() for part in raw.split(",") if part.strip())


def _build_event_updates(body: OAuthAttemptEventRequest, now: datetime) -> dict:
    updates: dict[str, object] = {}

    if body.event == "callback_received":
        updates["status"] = "callback_received"
        updates["callback_received_at"] = now.isoformat()
    elif body.event == "session_detected":
        updates["status"] = "session_detected"
        updates["session_detected_at"] = now.isoformat()
    elif body.event == "profile_missing":
        updates["status"] = "session_detected"
        updates["profile_state"] = "missing"
    elif body.event == "profile_present":
        updates["status"] = "session_detected"
        updates["profile_state"] = "present"
    elif body.event == "completed":
        if body.result is None:
            raise HTTPException(status_code=422, detail="completed event requires result")
        updates["status"] = "completed"
        updates["result"] = body.result
        updates["finalized_at"] = now.isoformat()
        if body.profile_state is not None:
            updates["profile_state"] = body.profile_state
    elif body.event == "failed":
        updates["status"] = "failed"
        updates["result"] = body.result or "login_error"
        updates["failure_category"] = body.failure_category or "unexpected"
        updates["finalized_at"] = now.isoformat()
        if body.callback_error_code is not None:
            updates["callback_error_code"] = body.callback_error_code
        if body.profile_state is not None:
            updates["profile_state"] = body.profile_state

    if body.callback_error_code is not None and "callback_error_code" not in updates:
        updates["callback_error_code"] = body.callback_error_code
    if body.profile_state is not None and "profile_state" not in updates:
        updates["profile_state"] = body.profile_state

    return updates


def _serialize_recent_attempt(row: dict) -> dict:
    finalized_at = row.get("finalized_at")
    created_at = row.get("created_at")
    duration_ms = row.get("duration_ms")
    if duration_ms is None:
        duration_ms = _calculate_duration_ms(row)
    return {
        "attempt_id": row.get("attempt_id"),
        "provider": row.get("provider"),
        "status": row.get("status"),
        "result": row.get("result"),
        "failure_category": row.get("failure_category"),
        "redirect_origin": row.get("redirect_origin"),
        "created_at": created_at,
        "callback_received_at": row.get("callback_received_at"),
        "finalized_at": finalized_at,
        "duration_ms": duration_ms,
    }


@router.post("/auth/oauth/attempts")
async def create_oauth_attempt(body: CreateOAuthAttemptRequest):
    with tracer.start_as_current_span("auth.oauth.attempt.create") as span:
        settings = get_settings()
        admin = get_supabase_admin()
        attempt_secret = _generate_attempt_secret()
        expires_at = (_utc_now() + timedelta(minutes=ATTEMPT_TTL_MINUTES)).isoformat()
        origin_allowed = _is_origin_allowed(settings, body.redirect_origin)

        payload = {
            "provider": body.provider,
            "attempt_secret_hash": _hash_attempt_secret(attempt_secret),
            "redirect_origin": body.redirect_origin,
            "next_path": body.next_path,
            "status": "started",
            "expires_at": expires_at,
        }

        try:
            created = _insert_oauth_attempt(admin, payload)
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Failed to create OAuth attempt") from exc

        oauth_attempts_counter.add(1, {"auth.provider": body.provider})
        logger.info(
            "auth.oauth.attempt.started",
            extra={
                "auth.provider": body.provider,
                "origin_allowed": origin_allowed,
                "has_next_path": body.next_path is not None,
            },
        )

        span.set_attribute("auth.provider", body.provider)
        span.set_attribute("origin_allowed", origin_allowed)
        span.set_attribute("has_next_path", body.next_path is not None)

        return {
            "attempt_id": created["attempt_id"],
            "attempt_secret": attempt_secret,
            "expires_at": created["expires_at"],
        }


@router.post("/auth/oauth/attempts/{attempt_id}/events")
async def record_oauth_attempt_event(attempt_id: str, body: OAuthAttemptEventRequest):
    with tracer.start_as_current_span("auth.oauth.attempt.event") as span:
        admin = get_supabase_admin()
        row = _load_oauth_attempt(admin, attempt_id)
        if row is None:
            raise HTTPException(status_code=404, detail="OAuth attempt not found")
        if not _verify_attempt_secret(body.attempt_secret, row["attempt_secret_hash"]):
            raise HTTPException(status_code=403, detail="Invalid OAuth attempt secret")
        if _is_attempt_expired(row):
            raise HTTPException(status_code=410, detail="OAuth attempt expired")

        now = _utc_now()
        updates = _build_event_updates(body, now)

        try:
            updated = _update_oauth_attempt(admin, attempt_id, updates)
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Failed to update OAuth attempt") from exc

        provider = row.get("provider", "unknown")
        span.set_attribute("auth.provider", provider)
        span.set_attribute("event", body.event)
        if updated.get("status") is not None:
            span.set_attribute("status", updated["status"])
        if body.result is not None:
            span.set_attribute("result", body.result)
        if body.failure_category is not None:
            span.set_attribute("failure_category", body.failure_category)
        if body.profile_state is not None:
            span.set_attribute("profile_state", body.profile_state)
        if body.callback_error_code is not None:
            span.set_attribute("callback_error_code", body.callback_error_code)
        if body.http_status_code is not None:
            span.set_attribute("http.status_code", body.http_status_code)

        if updated.get("status") == "failed":
            failure_category = updated.get("failure_category") or body.failure_category or "unexpected"
            oauth_failures_counter.add(1, {"auth.provider": provider, "failure_category": failure_category})
            logger.warning(
                "auth.oauth.attempt.failed",
                extra={
                    "auth.provider": provider,
                    "failure_category": failure_category,
                    "callback_error_code": updated.get("callback_error_code"),
                },
            )
        elif updated.get("status") == "completed":
            logger.info(
                "auth.oauth.attempt.completed",
                extra={
                    "auth.provider": provider,
                    "result": updated.get("result"),
                },
            )

        duration_ms = _calculate_duration_ms(updated)
        if duration_ms is not None and updated.get("status") in {"completed", "failed"}:
            oauth_attempt_duration_ms.record(
                duration_ms,
                {
                    "auth.provider": provider,
                    "result": updated.get("result") or body.result or "login_error",
                },
            )
            span.set_attribute("duration_ms", duration_ms)

        return {"ok": True, "status": updated["status"]}


@router.get("/admin/auth/oauth/providers/status", openapi_extra={"x-required-role": "platform_admin"})
async def get_oauth_provider_status(_=Depends(require_superuser)):
    with tracer.start_as_current_span("auth.oauth.providers.status") as span:
        settings = get_settings()
        checked_at = _utc_now().isoformat()
        config = _fetch_supabase_auth_config(settings)

        external = config.get("external") or {}
        google_enabled = bool(config.get("external_google_enabled", external.get("google")))
        github_enabled = bool(config.get("external_github_enabled", external.get("github")))
        callback_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/callback"

        logger.info(
            "auth.oauth.providers.status.checked",
            extra={
                "google_enabled": google_enabled,
                "github_enabled": github_enabled,
            },
        )

        span.set_attribute("status", "ok")

        return {
            "google_enabled": google_enabled,
            "github_enabled": github_enabled,
            "supabase_callback_url": callback_url,
            "expected_redirect_origins": list(_expected_redirect_origins(settings)),
            "checked_at": checked_at,
        }


@router.get("/admin/auth/oauth/attempts/recent", openapi_extra={"x-required-role": "platform_admin"})
async def list_recent_oauth_attempts(
    limit: int = Query(default=50, ge=1, le=200),
    _=Depends(require_superuser),
):
    with tracer.start_as_current_span("auth.oauth.attempts.recent") as span:
        admin = get_supabase_admin()
        attempts = _list_recent_oauth_attempts(admin, limit)
        span.set_attribute("limit", limit)
        return {"attempts": [_serialize_recent_attempt(row) for row in attempts]}
