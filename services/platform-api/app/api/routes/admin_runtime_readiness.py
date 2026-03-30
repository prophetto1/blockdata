from __future__ import annotations

import logging
from time import perf_counter
from typing import Literal

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
            set_span_attributes(
                span,
                {
                    "surface": surface,
                    "result": "ok",
                    "degraded_count": degraded_count,
                    "failed_count": failed_count,
                    "http.status_code": 200,
                },
            )
            record_runtime_readiness_snapshot(
                result="ok",
                degraded_count=degraded_count,
                failed_count=failed_count,
                http_status_code=200,
            )
            if degraded_count > 0 or failed_count > 0:
                logger.warning(
                    "admin.runtime.readiness.degraded",
                    extra={
                        "surface": surface,
                        "degraded_count": degraded_count,
                        "failed_count": failed_count,
                        "failed_check_ids": [
                            check["id"]
                            for grouped_surface in snapshot["surfaces"]
                            for check in grouped_surface["checks"]
                            if check["status"] in {"warn", "fail"}
                        ],
                    },
                )
            return snapshot
        except Exception as exc:
            set_span_attributes(
                span,
                {
                    "surface": surface,
                    "result": "error",
                    "degraded_count": 0,
                    "failed_count": 0,
                    "http.status_code": 500,
                },
            )
            record_runtime_readiness_snapshot(
                result="error",
                degraded_count=0,
                failed_count=0,
                http_status_code=500,
            )
            logger.exception("Failed to build runtime readiness snapshot")
            raise HTTPException(status_code=500, detail="Failed to build runtime readiness snapshot") from exc
