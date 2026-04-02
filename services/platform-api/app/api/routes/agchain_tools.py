from __future__ import annotations

import logging
import time
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from opentelemetry import metrics, trace
from pydantic import BaseModel, Field

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.tool_registry import (
    archive_tool,
    create_tool,
    create_tool_version,
    get_tool_detail,
    get_tools_bootstrap,
    list_tools,
    publish_tool_version,
    update_tool,
    update_tool_version,
)
from app.domain.agchain.tool_resolution import preview_tool_definition
from app.observability.contract import safe_attributes, set_span_attributes

router = APIRouter(prefix="/agchain/tools", tags=["agchain-tools"])
logger = logging.getLogger("agchain-tools")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

tools_list_counter = meter.create_counter("platform.agchain.tools.list.count")
tools_bootstrap_counter = meter.create_counter("platform.agchain.tools.bootstrap.count")
tools_preview_counter = meter.create_counter("platform.agchain.tools.preview.count")
tools_get_counter = meter.create_counter("platform.agchain.tools.get.count")
tools_create_counter = meter.create_counter("platform.agchain.tools.create.count")
tools_update_counter = meter.create_counter("platform.agchain.tools.update.count")
tools_versions_create_counter = meter.create_counter("platform.agchain.tools.versions.create.count")
tools_versions_update_counter = meter.create_counter("platform.agchain.tools.versions.update.count")
tools_versions_publish_counter = meter.create_counter("platform.agchain.tools.versions.publish.count")
tools_archive_counter = meter.create_counter("platform.agchain.tools.archive.count")
tools_list_duration_ms = meter.create_histogram("platform.agchain.tools.list.duration_ms")
tools_preview_duration_ms = meter.create_histogram("platform.agchain.tools.preview.duration_ms")
tools_write_duration_ms = meter.create_histogram("platform.agchain.tools.write.duration_ms")


class ToolCreateRequest(BaseModel):
    project_id: str = Field(min_length=1)
    tool: dict[str, Any] = Field(default_factory=dict)
    initial_version: dict[str, Any] = Field(default_factory=dict)


class ToolUpdateRequest(BaseModel):
    project_id: str = Field(min_length=1)
    display_name: str | None = None
    description: str | None = None
    approval_mode: str | None = None
    sandbox_requirement_jsonb: dict[str, Any] = Field(default_factory=dict)


class ToolVersionCreateRequest(BaseModel):
    project_id: str = Field(min_length=1)
    version_label: str = Field(min_length=1)
    input_schema_jsonb: dict[str, Any] = Field(default_factory=dict)
    output_schema_jsonb: dict[str, Any] = Field(default_factory=dict)
    tool_config_jsonb: dict[str, Any] = Field(default_factory=dict)
    parallel_calls_allowed: bool = False
    status: str = "draft"


class ToolVersionUpdateRequest(BaseModel):
    project_id: str = Field(min_length=1)
    version_label: str | None = None
    input_schema_jsonb: dict[str, Any] | None = None
    output_schema_jsonb: dict[str, Any] | None = None
    tool_config_jsonb: dict[str, Any] | None = None
    parallel_calls_allowed: bool | None = None
    status: str | None = None


class ToolActionRequest(BaseModel):
    project_id: str = Field(min_length=1)


class ToolPreviewRequest(BaseModel):
    project_id: str = Field(min_length=1)
    source_kind: str = Field(min_length=1)
    draft: dict[str, Any] = Field(default_factory=dict)


@router.get("", summary="List AG chain tools")
async def list_tools_route(
    project_id: str = Query(...),
    source_kind: str | None = Query(default=None),
    include_archived: bool = Query(default=False),
    cursor: str | None = Query(default=None),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.tools.list") as span:
        payload = list_tools(
            user_id=auth.user_id,
            project_id=project_id,
            source_kind=source_kind,
            include_archived=include_archived,
            cursor=cursor,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "project_id_present": True,
            "source_kind": source_kind,
            "tool_count": len(payload["items"]),
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        tools_list_counter.add(1, safe_attributes(attrs))
        tools_list_duration_ms.record(duration_ms, safe_attributes(attrs))
        return payload


@router.get("/new/bootstrap", summary="Load AG chain tool bootstrap defaults")
async def get_tools_bootstrap_route(
    project_id: str = Query(...),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.tools.new.bootstrap") as span:
        payload = get_tools_bootstrap(user_id=auth.user_id, project_id=project_id)
        attrs = {
            "project_id_present": True,
            "tool_count": len(payload["builtin_catalog"]),
        }
        set_span_attributes(span, attrs)
        tools_bootstrap_counter.add(1, safe_attributes(attrs))
        return payload


@router.post("/new/preview", summary="Preview an AG chain tool draft")
async def preview_tool_route(
    body: ToolPreviewRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.tools.new.preview") as span:
        payload = preview_tool_definition(
            user_id=auth.user_id,
            project_id=body.project_id,
            source_kind=body.source_kind,
            draft=body.draft,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "project_id_present": True,
            "source_kind": body.source_kind,
            "discovered_count": len(payload["discovered_tools"]),
            "has_secret_refs": bool(payload["missing_secret_slots"] or (payload["normalized_definition"].get("tool_config_jsonb") or {}).get("secret_slots")),
            "result": "ok" if payload["validation"]["ok"] else "invalid",
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        tools_preview_counter.add(1, safe_attributes(attrs))
        tools_preview_duration_ms.record(duration_ms, safe_attributes(attrs))
        if not payload["validation"]["ok"]:
            logger.warning(
                "agchain.tools.preview_failed",
                extra=safe_attributes(
                    {
                        "source_kind": body.source_kind,
                        "result": "invalid",
                        "discovered_count": len(payload["discovered_tools"]),
                        "missing_secret_slot_count": len(payload["missing_secret_slots"]),
                    }
                ),
            )
        return payload


@router.get("/{tool_id}/detail", summary="Get one AG chain tool detail")
async def get_tool_detail_route(
    tool_id: UUID,
    project_id: str = Query(...),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.tools.get") as span:
        payload = get_tool_detail(user_id=auth.user_id, project_id=project_id, tool_id=str(tool_id))
        attrs = {
            "project_id_present": True,
            "source_kind": (payload.get("tool") or {}).get("source_kind"),
            "has_latest_version": payload.get("latest_version") is not None,
        }
        set_span_attributes(span, attrs)
        tools_get_counter.add(1, safe_attributes(attrs))
        return payload


@router.post("", summary="Create an AG chain tool")
async def create_tool_route(
    body: ToolCreateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.tools.create") as span:
        payload = create_tool(
            user_id=auth.user_id,
            project_id=body.project_id,
            tool=body.tool,
            initial_version=body.initial_version,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {"project_id_present": True, "result": "created", "latency_ms": duration_ms}
        set_span_attributes(span, attrs)
        tools_create_counter.add(1, safe_attributes(attrs))
        tools_write_duration_ms.record(duration_ms, safe_attributes(attrs))
        return payload


@router.patch("/{tool_id}", summary="Update one AG chain tool")
async def update_tool_route(
    tool_id: UUID,
    body: ToolUpdateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.tools.update") as span:
        payload = update_tool(
            user_id=auth.user_id,
            project_id=body.project_id,
            tool_id=str(tool_id),
            updates=body.model_dump(exclude={"project_id"}, exclude_none=True),
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {"project_id_present": True, "result": "updated", "latency_ms": duration_ms}
        set_span_attributes(span, attrs)
        tools_update_counter.add(1, safe_attributes(attrs))
        tools_write_duration_ms.record(duration_ms, safe_attributes(attrs))
        return payload


@router.post("/{tool_id}/versions", summary="Create one AG chain tool version")
async def create_tool_version_route(
    tool_id: UUID,
    body: ToolVersionCreateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.tools.versions.create") as span:
        payload = create_tool_version(
            user_id=auth.user_id,
            project_id=body.project_id,
            tool_id=str(tool_id),
            payload=body.model_dump(exclude={"project_id"}),
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {"project_id_present": True, "result": "created", "latency_ms": duration_ms}
        set_span_attributes(span, attrs)
        tools_versions_create_counter.add(1, safe_attributes(attrs))
        tools_write_duration_ms.record(duration_ms, safe_attributes(attrs))
        return payload


@router.patch("/{tool_id}/versions/{tool_version_id}", summary="Update one AG chain tool version")
async def update_tool_version_route(
    tool_id: UUID,
    tool_version_id: UUID,
    body: ToolVersionUpdateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.tools.versions.update") as span:
        payload = update_tool_version(
            user_id=auth.user_id,
            project_id=body.project_id,
            tool_id=str(tool_id),
            tool_version_id=str(tool_version_id),
            updates=body.model_dump(exclude={"project_id"}, exclude_none=True),
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {"project_id_present": True, "result": "updated", "latency_ms": duration_ms}
        set_span_attributes(span, attrs)
        tools_versions_update_counter.add(1, safe_attributes(attrs))
        tools_write_duration_ms.record(duration_ms, safe_attributes(attrs))
        return payload


@router.post("/{tool_id}/versions/{tool_version_id}/publish", summary="Publish one AG chain tool version")
async def publish_tool_version_route(
    tool_id: UUID,
    tool_version_id: UUID,
    body: ToolActionRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.tools.versions.publish") as span:
        payload = publish_tool_version(
            user_id=auth.user_id,
            project_id=body.project_id,
            tool_id=str(tool_id),
            tool_version_id=str(tool_version_id),
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {"project_id_present": True, "result": "published", "latency_ms": duration_ms}
        set_span_attributes(span, attrs)
        tools_versions_publish_counter.add(1, safe_attributes(attrs))
        tools_write_duration_ms.record(duration_ms, safe_attributes(attrs))
        return payload


@router.post("/{tool_id}/archive", summary="Archive one AG chain tool")
async def archive_tool_route(
    tool_id: UUID,
    body: ToolActionRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.tools.archive") as span:
        payload = archive_tool(
            user_id=auth.user_id,
            project_id=body.project_id,
            tool_id=str(tool_id),
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {"project_id_present": True, "result": "archived", "latency_ms": duration_ms}
        set_span_attributes(span, attrs)
        tools_archive_counter.add(1, safe_attributes(attrs))
        tools_write_duration_ms.record(duration_ms, safe_attributes(attrs))
        return payload
