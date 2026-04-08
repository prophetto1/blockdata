from __future__ import annotations

import logging
from time import perf_counter
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_superuser
from app.auth.principals import AuthPrincipal
from app.core.config import get_settings
from app.observability import get_telemetry_status
from app.observability.contract import set_span_attributes
from app.observability.otel import execute_telemetry_export_probe
from app.observability.runtime_readiness_metrics import record_runtime_probe, tracer
from app.services.runtime_probe_service import get_latest_runtime_probe_run_for_probe_kind

logger = logging.getLogger("platform-api.telemetry")
router = APIRouter(prefix="/observability", tags=["observability"])
admin_router = APIRouter(prefix="/admin/runtime/telemetry", tags=["admin-runtime-telemetry"])

_TELEMETRY_EXPORT_PROBE_KIND = "telemetry_export_probe"
_TELEMETRY_PROOF_SURFACE = "observability"


def _record_probe_observability(
    *,
    span: Any,
    probe_id: str,
    surface: str,
    result: str,
    duration_ms: float,
    error_type: str | None,
    http_status_code: int,
) -> None:
    try:
        set_span_attributes(
            span,
            {
                "probe_id": probe_id,
                "surface": surface,
                "result": result,
                "error_type": error_type,
                "http.status_code": http_status_code,
            },
        )
        record_runtime_probe(
            probe_id=probe_id,
            surface=surface,
            result=result,
            duration_ms=duration_ms,
            error_type=error_type,
        )
        log_extra = {
            "probe_id": probe_id,
            "surface": surface,
            "result": result,
        }
        if error_type is not None:
            log_extra["error_type"] = error_type
        if result == "failure":
            logger.warning("runtime_probe_run", extra=log_extra)
        else:
            logger.info("runtime_probe_run", extra=log_extra)
    except Exception:
        logger.warning(
            "Failed to record telemetry probe observability",
            exc_info=True,
            extra={"probe_id": probe_id, "surface": surface, "result": result},
        )


@router.get("/telemetry-status")
async def telemetry_status(_=Depends(require_superuser)):
    settings = get_settings()
    latest_probe_run = None
    try:
        latest_probe_run = get_latest_runtime_probe_run_for_probe_kind(
            probe_kind=_TELEMETRY_EXPORT_PROBE_KIND
        )
    except Exception:
        logger.warning("Failed to load latest telemetry export probe run", exc_info=True)
    return get_telemetry_status(settings, latest_export_probe_run=latest_probe_run)


@admin_router.post("/export/probe", openapi_extra={"x-required-role": "platform_admin"})
async def post_telemetry_export_probe(
    auth: AuthPrincipal = Depends(require_superuser),
):
    probe_id = _TELEMETRY_EXPORT_PROBE_KIND
    started = perf_counter()
    with tracer.start_as_current_span("runtime.probe.execute") as span:
        try:
            status = await execute_telemetry_export_probe(
                get_settings(),
                actor_id=auth.user_id,
            )
            latest_probe_run = status.get("latest_export_probe_run")
            error_type = None
            if isinstance(latest_probe_run, dict):
                evidence = latest_probe_run.get("evidence")
                if isinstance(evidence, dict):
                    next_error_type = evidence.get("error_type")
                    if isinstance(next_error_type, str):
                        error_type = next_error_type
            _record_probe_observability(
                span=span,
                probe_id=probe_id,
                surface=_TELEMETRY_PROOF_SURFACE,
                result="success" if status.get("proof_status") == "passing" else "failure",
                duration_ms=(perf_counter() - started) * 1000.0,
                error_type=error_type,
                http_status_code=200,
            )
            return status
        except Exception as exc:
            _record_probe_observability(
                span=span,
                probe_id=probe_id,
                surface=_TELEMETRY_PROOF_SURFACE,
                result="failure",
                duration_ms=(perf_counter() - started) * 1000.0,
                error_type=type(exc).__name__,
                http_status_code=500,
            )
            raise HTTPException(status_code=500, detail="Failed to execute telemetry export probe") from exc
