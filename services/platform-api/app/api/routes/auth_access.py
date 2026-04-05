from __future__ import annotations

from time import perf_counter

from fastapi import APIRouter, Depends, HTTPException
from opentelemetry import metrics, trace

from app.auth.dependencies import (
    ADMIN_ROLE_VERIFICATION_UNAVAILABLE_DETAIL,
    require_user_auth,
)
from app.auth.principals import AuthPrincipal
from app.observability.contract import safe_attributes, set_span_attributes

router = APIRouter(prefix="/auth", tags=["auth-access"])
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

access_read_counter = meter.create_counter("platform.auth.access.read.count")
access_read_duration_ms = meter.create_histogram("platform.auth.access.read.duration_ms")


@router.get("/access")
async def get_auth_access(auth: AuthPrincipal = Depends(require_user_auth)):
    started = perf_counter()
    with tracer.start_as_current_span("auth.access.read") as span:
        if auth.admin_role_verification_failed:
            duration_ms = max(0, int((perf_counter() - started) * 1000))
            attrs = {
                "result": "admin_role_verification_unavailable",
                "http.status_code": 503,
            }
            set_span_attributes(span, attrs)
            metric_attrs = safe_attributes(attrs)
            access_read_counter.add(1, metric_attrs)
            access_read_duration_ms.record(duration_ms, metric_attrs)
            raise HTTPException(
                status_code=503,
                detail=ADMIN_ROLE_VERIFICATION_UNAVAILABLE_DETAIL,
            )

        payload = {
            "blockdata_admin": auth.has_role("blockdata_admin"),
            "agchain_admin": auth.has_role("agchain_admin"),
            "superuser": auth.has_role("platform_admin"),
        }
        duration_ms = max(0, int((perf_counter() - started) * 1000))
        attrs = {**payload, "result": "ok", "http.status_code": 200}
        set_span_attributes(span, attrs)
        metric_attrs = safe_attributes(attrs)
        access_read_counter.add(1, metric_attrs)
        access_read_duration_ms.record(duration_ms, metric_attrs)
        return payload
