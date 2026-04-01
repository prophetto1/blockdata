from __future__ import annotations

import logging
from time import perf_counter
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.dependencies import require_superuser
from app.auth.principals import AuthPrincipal
from app.observability.contract import set_span_attributes
from app.observability.runtime_readiness_metrics import (
    record_runtime_readiness_snapshot,
    tracer,
)
from app.services.runtime_readiness import get_runtime_readiness_snapshot

logger = logging.getLogger("platform-api.admin-runtime-readiness")
router = APIRouter(prefix="/admin/runtime", tags=["admin-runtime-readiness"])


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
