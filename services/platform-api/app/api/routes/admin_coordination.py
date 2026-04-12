from __future__ import annotations

import logging
from time import perf_counter

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from opentelemetry import trace
from pydantic import BaseModel

from app.auth.dependencies import require_superuser
from app.auth.principals import AuthPrincipal
from app.observability.contract import (
    COORDINATION_API_IDENTITIES_READ_SPAN_NAME,
    COORDINATION_API_STATUS_READ_SPAN_NAME,
    COORDINATION_API_STREAM_OPEN_SPAN_NAME,
    COORDINATION_TRACER_NAME,
    set_span_attributes,
)
from app.services.coordination import (
    COORDINATION_STREAM_MEDIA_TYPE,
    CoordinationRuntimeDisabledError,
    CoordinationUnavailableError,
    disabled_error_payload,
)

logger = logging.getLogger("platform-api.admin-coordination")
tracer = trace.get_tracer(COORDINATION_TRACER_NAME)
router = APIRouter(prefix="/admin/runtime/coordination", tags=["admin-runtime-coordination"])


class TaskEventProbeRequest(BaseModel):
    task_id: str
    event_kind: str
    note: str | None = None


def _status_service(request: Request):
    return request.app.state.coordination_status_service


def _event_stream_service(request: Request):
    return request.app.state.coordination_event_stream_service


@router.get("/status", openapi_extra={"x-required-role": "platform_admin"})
async def get_coordination_status(
    request: Request,
    _auth: AuthPrincipal = Depends(require_superuser),
):
    service = _status_service(request)
    with tracer.start_as_current_span(COORDINATION_API_STATUS_READ_SPAN_NAME) as span:
        started = perf_counter()
        try:
            payload = await service.get_status()
            set_span_attributes(span, {"coord.result": "ok", "http.status_code": 200})
            return payload
        except CoordinationRuntimeDisabledError:
            set_span_attributes(span, {"coord.result": "disabled", "http.status_code": 503})
            raise HTTPException(status_code=503, detail=disabled_error_payload())
        finally:
            set_span_attributes(span, {"coord.duration_ms": (perf_counter() - started) * 1000.0})


@router.get("/identities", openapi_extra={"x-required-role": "platform_admin"})
async def get_coordination_identities(
    request: Request,
    host: str | None = Query(default=None),
    family: str | None = Query(default=None),
    include_stale: bool = Query(default=False),
    _auth: AuthPrincipal = Depends(require_superuser),
):
    service = _status_service(request)
    with tracer.start_as_current_span(COORDINATION_API_IDENTITIES_READ_SPAN_NAME) as span:
        started = perf_counter()
        try:
            payload = await service.get_identities(host=host, family=family, include_stale=include_stale)
            summary = payload.get("summary") or {}
            set_span_attributes(
                span,
                {
                    "coord.result": "ok",
                    "coord.unknown_count": summary.get("session_classification_unknown_count"),
                    "http.status_code": 200,
                },
            )
            return payload
        except CoordinationRuntimeDisabledError:
            set_span_attributes(span, {"coord.result": "disabled", "http.status_code": 503})
            raise HTTPException(status_code=503, detail=disabled_error_payload())
        except CoordinationUnavailableError as exc:
            set_span_attributes(span, {"coord.result": "unavailable", "http.status_code": 503})
            raise HTTPException(
                status_code=503,
                detail={"code": "coordination_unavailable", "message": str(exc)},
            ) from exc
        finally:
            set_span_attributes(span, {"coord.duration_ms": (perf_counter() - started) * 1000.0})


@router.get("/discussions", openapi_extra={"x-required-role": "platform_admin"})
async def get_coordination_discussions(
    request: Request,
    task_id: str | None = Query(default=None),
    workspace_path: str | None = Query(default=None),
    status: str = Query(default="all", pattern="^(pending|acknowledged|stale|all)$"),
    limit: int = Query(default=50, ge=0, le=250),
    _auth: AuthPrincipal = Depends(require_superuser),
):
    service = _status_service(request)
    try:
        return await service.get_discussions(
            task_id=task_id,
            workspace_path=workspace_path,
            status=status,
            limit=limit,
        )
    except CoordinationRuntimeDisabledError:
        raise HTTPException(status_code=503, detail=disabled_error_payload())
    except CoordinationUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "coordination_unavailable", "message": str(exc)},
        ) from exc


@router.get("/tasks/{task_id}", openapi_extra={"x-required-role": "platform_admin"})
async def get_coordination_task_snapshot(
    task_id: str,
    request: Request,
    limit: int = Query(default=25, ge=1, le=250),
    _auth: AuthPrincipal = Depends(require_superuser),
):
    service = _status_service(request)
    try:
        return await service.get_task_snapshot(task_id=task_id, limit=limit)
    except CoordinationRuntimeDisabledError:
        raise HTTPException(status_code=503, detail=disabled_error_payload())


@router.get("/events/stream", openapi_extra={"x-required-role": "platform_admin"})
async def get_coordination_event_stream(
    request: Request,
    task_id: str | None = Query(default=None),
    subject_prefix: str | None = Query(default=None),
    limit: int = Query(default=50, ge=0, le=250),
    _auth: AuthPrincipal = Depends(require_superuser),
):
    service = _event_stream_service(request)
    if not service.enabled:
        return JSONResponse(status_code=503, content={"detail": disabled_error_payload()})

    async def _iter():
        with tracer.start_as_current_span(COORDINATION_API_STREAM_OPEN_SPAN_NAME) as span:
            set_span_attributes(span, {"coord.result": "open"})
            async for chunk in service.stream(task_id=task_id, subject_prefix=subject_prefix, limit=limit):
                yield chunk

    return StreamingResponse(_iter(), media_type=COORDINATION_STREAM_MEDIA_TYPE)


@router.post("/probes/task-event", openapi_extra={"x-required-role": "platform_admin"})
async def post_coordination_task_event_probe(
    body: TaskEventProbeRequest,
    request: Request,
    auth: AuthPrincipal = Depends(require_superuser),
):
    service = _status_service(request)
    try:
        result = await service.publish_probe_task_event(
            task_id=body.task_id,
            event_kind=body.event_kind,
            note=body.note,
            actor_id=auth.user_id,
        )
    except CoordinationRuntimeDisabledError:
        raise HTTPException(status_code=503, detail=disabled_error_payload())
    except CoordinationUnavailableError as exc:
        raise HTTPException(status_code=503, detail={"code": "coordination_unavailable", "message": str(exc)}) from exc

    status_code = 202 if result.get("buffered") else 200
    return JSONResponse(status_code=status_code, content=result)
