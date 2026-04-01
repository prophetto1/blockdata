from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends
from opentelemetry import metrics, trace

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.operation_queue import cancel_operation, load_operation_row, load_operation_status
from app.domain.agchain.project_access import require_project_access
from app.observability.contract import safe_attributes, set_span_attributes


router = APIRouter(prefix="/agchain/operations", tags=["agchain-operations"])
logger = logging.getLogger("agchain-operations")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

operations_get_counter = meter.create_counter("platform.agchain.operations.get.count")
operations_cancel_counter = meter.create_counter("platform.agchain.operations.cancel.count")


@router.get("/{operation_id}", summary="Poll one AG chain operation")
async def get_operation_route(
    operation_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.operations.get") as span:
        row = load_operation_row(operation_id=operation_id)
        access = require_project_access(user_id=auth.user_id, project_id=row["project_id"])
        result = load_operation_status(operation_id=operation_id)

        latency_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "project_id_present": True,
            "membership_role": access["membership_role"],
            "operation_type": result["operation_type"],
            "status": result["status"],
            "http.status_code": 200,
            "latency_ms": latency_ms,
        }
        set_span_attributes(span, attrs)
        operations_get_counter.add(1, safe_attributes(attrs))
        return result


@router.post("/{operation_id}/cancel", summary="Cancel one AG chain operation")
async def cancel_operation_route(
    operation_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.operations.cancel") as span:
        row = load_operation_row(operation_id=operation_id)
        access = require_project_access(user_id=auth.user_id, project_id=row["project_id"])
        result = cancel_operation(operation_id=operation_id)

        latency_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "project_id_present": True,
            "membership_role": access["membership_role"],
            "operation_type": result["operation_type"],
            "status": result["status"],
            "result": "cancelled" if result["status"] == "cancelled" else "cancel_requested",
            "http.status_code": 200,
            "latency_ms": latency_ms,
        }
        set_span_attributes(span, attrs)
        operations_cancel_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.operations.cancelled",
            extra={
                "operation_id": operation_id,
                "project_id": row["project_id"],
                "result": attrs["result"],
            },
        )
        return result

