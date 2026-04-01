from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends, Query
from opentelemetry import metrics, trace
from pydantic import BaseModel, Field

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.workspace_registry import (
    create_project,
    get_project,
    list_organizations,
    list_projects,
    update_project,
)
from app.observability.contract import safe_attributes, set_span_attributes


router = APIRouter(prefix="/agchain", tags=["agchain-workspaces"])
logger = logging.getLogger("agchain-workspaces")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

organizations_list_counter = meter.create_counter("platform.agchain.organizations.list.count")
projects_list_counter = meter.create_counter("platform.agchain.projects.list.count")
projects_create_counter = meter.create_counter("platform.agchain.projects.create.count")
projects_update_counter = meter.create_counter("platform.agchain.projects.update.count")

projects_list_duration_ms = meter.create_histogram("platform.agchain.projects.list.duration_ms")


class ProjectCreateRequest(BaseModel):
    organization_id: str | None = None
    project_name: str = Field(min_length=1)
    project_slug: str | None = None
    description: str = ""
    seed_initial_benchmark: bool = True
    initial_benchmark_name: str | None = None


class ProjectUpdateRequest(BaseModel):
    project_name: str | None = None
    project_slug: str | None = None
    description: str | None = None


@router.get("/organizations", summary="List AG chain organizations")
async def list_organizations_route(auth: AuthPrincipal = Depends(require_user_auth)):
    with tracer.start_as_current_span("agchain.organizations.list") as span:
        items = list_organizations(user_id=auth.user_id)
        attrs = {
            "row_count": len(items),
        }
        set_span_attributes(span, attrs)
        organizations_list_counter.add(1, safe_attributes(attrs))
        return {"items": items}


@router.get("/projects", summary="List AG chain projects")
async def list_projects_route(
    organization_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.projects.list") as span:
        items = list_projects(user_id=auth.user_id, organization_id=organization_id, search=search)
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "organization_id_present": organization_id is not None,
            "row_count": len(items),
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        projects_list_counter.add(1, safe_attributes(attrs))
        projects_list_duration_ms.record(duration_ms, safe_attributes(attrs))
        return {"items": items}


@router.post("/projects", summary="Create an AG chain project")
async def create_project_route(
    body: ProjectCreateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.projects.create") as span:
        result = create_project(user_id=auth.user_id, payload=body.model_dump())
        attrs = {
            "organization_id_present": body.organization_id is not None,
            "result": "created",
        }
        set_span_attributes(span, attrs)
        projects_create_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.projects.created",
            extra=safe_attributes(
                {
                    "project_id": result["project_id"],
                    "organization_id": body.organization_id,
                    "benchmark_slug": result.get("primary_benchmark_slug"),
                    **attrs,
                }
            ),
        )
        return {"ok": True, **result}


@router.get("/projects/{project_id}", summary="Get one AG chain project")
async def get_project_route(
    project_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.projects.get") as span:
        result = get_project(user_id=auth.user_id, project_id=project_id)
        set_span_attributes(
            span,
            {
                "project_id_present": True,
                "membership_role": result["project"]["membership_role"],
            },
        )
        return result


@router.patch("/projects/{project_id}", summary="Update one AG chain project")
async def update_project_route(
    project_id: str,
    body: ProjectUpdateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.projects.update") as span:
        result = update_project(user_id=auth.user_id, project_id=project_id, payload=body.model_dump())
        attrs = {
            "project_id_present": True,
            "result": "updated",
        }
        set_span_attributes(span, attrs)
        projects_update_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.projects.updated",
            extra=safe_attributes({"project_id": project_id, **attrs}),
        )
        return result
