from __future__ import annotations

import logging
from time import perf_counter
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth.dependencies import require_superuser
from app.auth.principals import AuthPrincipal
from app.observability.contract import set_span_attributes
from app.observability.runtime_readiness_metrics import (
    record_runtime_probe,
    record_runtime_readiness_action,
    record_runtime_readiness_snapshot,
    tracer,
)
from app.services.runtime_action_service import reconcile_storage_browser_upload_cors
from app.services.runtime_readiness import get_runtime_readiness_snapshot
from app.services.runtime_probe_service import (
    get_runtime_readiness_check_detail,
    store_runtime_action_run,
    verify_runtime_readiness_check,
)

logger = logging.getLogger("platform-api.admin-runtime-readiness")
router = APIRouter(prefix="/admin/runtime", tags=["admin-runtime-readiness"])


class BrowserUploadCorsReconcileRequest(BaseModel):
    confirmed: Literal[True]


def _surface_from_check_id(check_id: str) -> str:
    prefix = check_id.split(".", 1)[0]
    return prefix if prefix in {"shared", "blockdata", "agchain"} else "shared"


def _record_snapshot_observability(
    *,
    span: Any,
    surface: str,
    result: str,
    degraded_count: int,
    failed_count: int,
    http_status_code: int,
) -> None:
    try:
        set_span_attributes(
            span,
            {
                "surface": surface,
                "result": result,
                "degraded_count": degraded_count,
                "failed_count": failed_count,
                "http.status_code": http_status_code,
            },
        )
        record_runtime_readiness_snapshot(
            result=result,
            degraded_count=degraded_count,
            failed_count=failed_count,
            http_status_code=http_status_code,
        )
    except Exception:
        logger.warning(
            "Failed to record runtime readiness snapshot observability",
            exc_info=True,
            extra={
                "surface": surface,
                "result": result,
                "http_status_code": http_status_code,
            },
        )


def _record_action_observability(
    *,
    span: Any,
    action_id: str,
    check_id: str,
    result: str,
    duration_ms: float,
    error_type: str | None,
    http_status_code: int,
) -> None:
    try:
        set_span_attributes(
            span,
            {
                "action_id": action_id,
                "check_id": check_id,
                "result": result,
                "error_type": error_type,
                "http.status_code": http_status_code,
            },
        )
        record_runtime_readiness_action(
            action_id=action_id,
            check_id=check_id,
            result=result,
            duration_ms=duration_ms,
            error_type=error_type,
        )
        log_extra = {
            "action_id": action_id,
            "check_id": check_id,
            "result": result,
        }
        if error_type is not None:
            log_extra["error_type"] = error_type

        if result == "failure":
            logger.exception("runtime_readiness_action", extra=log_extra)
        else:
            logger.info("runtime_readiness_action", extra=log_extra)
    except Exception:
        logger.warning(
            "Failed to record runtime readiness action observability",
            exc_info=True,
            extra={
                "action_id": action_id,
                "check_id": check_id,
                "result": result,
            },
        )


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
            logger.exception("runtime_probe_run", extra=log_extra)
        else:
            logger.info("runtime_probe_run", extra=log_extra)
    except Exception:
        logger.warning(
            "Failed to record runtime probe observability",
            exc_info=True,
            extra={
                "probe_id": probe_id,
                "surface": surface,
                "result": result,
            },
        )


@router.get("/readiness", openapi_extra={"x-required-role": "platform_admin"})
async def get_runtime_readiness(
    surface: Literal["all", "shared", "blockdata", "agchain"] = Query(default="all"),
    auth: AuthPrincipal = Depends(require_superuser),
):
    started = perf_counter()
    with tracer.start_as_current_span("admin.runtime.readiness.snapshot") as span:
        try:
            snapshot = get_runtime_readiness_snapshot(surface=surface, actor_id=auth.user_id)
            summary = snapshot["summary"]
            degraded_count = summary["warn"] + summary["fail"]
            failed_count = summary["fail"]
            _record_snapshot_observability(
                span=span,
                surface=surface,
                result="ok",
                degraded_count=degraded_count,
                failed_count=failed_count,
                http_status_code=200,
            )
            if degraded_count > 0 or failed_count > 0:
                try:
                    logger.warning(
                        "admin.runtime.readiness.degraded",
                        extra={
                            "surface": surface,
                            "degraded_count": degraded_count,
                            "failed_count": failed_count,
                            "failed_check_ids": [
                                check.get("id")
                                for grouped_surface in snapshot.get("surfaces", [])
                                for check in grouped_surface.get("checks", [])
                                if check.get("status") in {"warn", "fail"}
                            ],
                        },
                    )
                except Exception:
                    logger.warning(
                        "Failed to emit degraded runtime readiness warning",
                        exc_info=True,
                        extra={"surface": surface},
                    )
            return snapshot
        except Exception as exc:
            _record_snapshot_observability(
                span=span,
                surface=surface,
                result="error",
                degraded_count=0,
                failed_count=0,
                http_status_code=500,
            )
            logger.exception("Failed to build runtime readiness snapshot")
            raise HTTPException(status_code=500, detail="Failed to build runtime readiness snapshot") from exc


@router.get("/readiness/checks/{check_id}", openapi_extra={"x-required-role": "platform_admin"})
async def get_runtime_readiness_check_route(
    check_id: str,
    auth: AuthPrincipal = Depends(require_superuser),
):
    try:
        return get_runtime_readiness_check_detail(check_id=check_id, actor_id=auth.user_id)
    except RuntimeError as exc:
        if str(exc).startswith("Unknown runtime readiness check:"):
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        logger.exception("Failed to load runtime readiness check detail", extra={"check_id": check_id})
        raise HTTPException(status_code=500, detail="Failed to load runtime readiness check detail") from exc


@router.post("/readiness/checks/{check_id}/verify", openapi_extra={"x-required-role": "platform_admin"})
async def post_verify_runtime_readiness_check(
    check_id: str,
    auth: AuthPrincipal = Depends(require_superuser),
):
    probe_id = "readiness_check_verify"
    surface = _surface_from_check_id(check_id)
    started = perf_counter()
    with tracer.start_as_current_span("runtime.probe.execute") as span:
        try:
            result = verify_runtime_readiness_check(check_id=check_id, actor_id=auth.user_id)
            check = result.get("check") or {}
            latest_probe_run = result.get("latest_probe_run") or {}
            probe_result = "success" if latest_probe_run.get("result") == "ok" else "failure"
            error_type = None
            if probe_result == "failure":
                evidence = latest_probe_run.get("evidence") if isinstance(latest_probe_run.get("evidence"), dict) else {}
                error_type = evidence.get("error_type") if isinstance(evidence, dict) else None
            _record_probe_observability(
                span=span,
                probe_id=probe_id,
                surface=str(check.get("surface_id") or surface),
                result=probe_result,
                duration_ms=(perf_counter() - started) * 1000.0,
                error_type=error_type if isinstance(error_type, str) else None,
                http_status_code=200,
            )
            return result
        except RuntimeError as exc:
            if str(exc).startswith("Unknown runtime readiness check:"):
                _record_probe_observability(
                    span=span,
                    probe_id=probe_id,
                    surface=surface,
                    result="failure",
                    duration_ms=(perf_counter() - started) * 1000.0,
                    error_type="RuntimeError",
                    http_status_code=404,
                )
                raise HTTPException(status_code=404, detail=str(exc)) from exc
            _record_probe_observability(
                span=span,
                probe_id=probe_id,
                surface=surface,
                result="failure",
                duration_ms=(perf_counter() - started) * 1000.0,
                error_type=type(exc).__name__,
                http_status_code=500,
            )
            raise HTTPException(status_code=500, detail="Failed to verify runtime readiness check") from exc
        except Exception as exc:
            _record_probe_observability(
                span=span,
                probe_id=probe_id,
                surface=surface,
                result="failure",
                duration_ms=(perf_counter() - started) * 1000.0,
                error_type=type(exc).__name__,
                http_status_code=500,
            )
            raise HTTPException(status_code=500, detail="Failed to verify runtime readiness check") from exc


@router.post("/storage/browser-upload-cors/reconcile", openapi_extra={"x-required-role": "platform_admin"})
async def post_reconcile_browser_upload_cors(
    payload: BrowserUploadCorsReconcileRequest,
    auth: AuthPrincipal = Depends(require_superuser),
):
    _ = payload
    action_id = "storage_browser_upload_cors_reconcile"
    check_id = "blockdata.storage.bucket_cors"
    started = perf_counter()
    with tracer.start_as_current_span("runtime.readiness.action.execute") as span:
        try:
            result = reconcile_storage_browser_upload_cors(actor_id=auth.user_id)
            store_runtime_action_run(
                action_kind=action_id,
                check_id=check_id,
                result="ok",
                duration_ms=(perf_counter() - started) * 1000.0,
                request={"confirmed": True},
                result_payload=result.get("result_payload") if isinstance(result.get("result_payload"), dict) else {},
                failure_reason=None,
                actor_id=auth.user_id,
            )
            _record_action_observability(
                span=span,
                action_id=action_id,
                check_id=check_id,
                result="success",
                duration_ms=(perf_counter() - started) * 1000.0,
                error_type=None,
                http_status_code=200,
            )
            return result
        except Exception as exc:
            store_runtime_action_run(
                action_kind=action_id,
                check_id=check_id,
                result="error",
                duration_ms=(perf_counter() - started) * 1000.0,
                request={"confirmed": True},
                result_payload={},
                failure_reason=str(exc),
                actor_id=auth.user_id,
            )
            _record_action_observability(
                span=span,
                action_id=action_id,
                check_id=check_id,
                result="failure",
                duration_ms=(perf_counter() - started) * 1000.0,
                error_type=type(exc).__name__,
                http_status_code=500,
            )
            raise HTTPException(status_code=500, detail="Failed to reconcile browser upload CORS policy") from exc
