from __future__ import annotations

import logging
import time
from typing import Any, Iterable

from fastapi import HTTPException
from opentelemetry import metrics, trace

from app.infra.supabase_client import get_supabase_admin
from app.observability.contract import safe_attributes, set_span_attributes


PROJECT_ACCESS_DENIED_LOG_EVENT = "agchain.project.access_denied"

logger = logging.getLogger("agchain-project-access")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

project_access_duration_ms = meter.create_histogram("platform.agchain.project_access.check.duration_ms")


def _load_project_row(*, project_id: str, sb=None) -> dict[str, Any] | None:
    admin = sb or get_supabase_admin()
    return (
        admin.table("user_projects")
        .select("*")
        .eq("project_id", project_id)
        .maybe_single()
        .execute()
        .data
    )


def _load_project_membership(*, user_id: str, project_id: str, sb) -> dict[str, Any] | None:
    return (
        sb.table("agchain_project_memberships")
        .select("*")
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .eq("membership_status", "active")
        .maybe_single()
        .execute()
        .data
    )


def _load_org_admin_membership(*, user_id: str, organization_id: str, sb) -> dict[str, Any] | None:
    return (
        sb.table("agchain_organization_members")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("user_id", user_id)
        .eq("membership_role", "organization_admin")
        .eq("membership_status", "active")
        .maybe_single()
        .execute()
        .data
    )


def _deny_project_access(*, user_id: str, project_id: str, organization_id: str | None) -> None:
    logger.info(
        PROJECT_ACCESS_DENIED_LOG_EVENT,
        extra=safe_attributes(
            {
                "project_id_present": bool(project_id),
                "organization_id_present": organization_id is not None,
                "result": "denied",
                "http.status_code": 403,
            }
        ),
    )
    raise HTTPException(status_code=403, detail="Project access denied")


def load_accessible_projects(
    *,
    user_id: str,
    organization_id: str | None = None,
    sb=None,
) -> list[dict[str, Any]]:
    admin = sb or get_supabase_admin()
    membership_rows = (
        admin.table("agchain_project_memberships")
        .select("*")
        .eq("user_id", user_id)
        .eq("membership_status", "active")
        .execute()
        .data
        or []
    )
    memberships_by_project = {
        row["project_id"]: row["membership_role"]
        for row in membership_rows
        if row.get("project_id") and row.get("membership_role")
    }

    org_admin_rows = (
        admin.table("agchain_organization_members")
        .select("*")
        .eq("user_id", user_id)
        .eq("membership_role", "organization_admin")
        .eq("membership_status", "active")
        .execute()
        .data
        or []
    )
    org_admin_ids = {
        row["organization_id"]
        for row in org_admin_rows
        if row.get("organization_id")
    }

    query = admin.table("user_projects").select("*")
    if organization_id is not None:
        query = query.eq("organization_id", organization_id)
    project_rows = query.execute().data or []

    accessible: list[dict[str, Any]] = []
    for row in project_rows:
        project_id = row.get("project_id")
        org_id = row.get("organization_id")
        membership_role = memberships_by_project.get(project_id)
        if membership_role is None and org_id in org_admin_ids:
            membership_role = "organization_admin"
        if membership_role is None:
            continue
        accessible.append({**row, "membership_role": membership_role})
    return accessible


def require_project_access(*, user_id: str, project_id: str, sb=None) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.project_access.check") as span:
        project = _load_project_row(project_id=project_id, sb=admin)
        organization_id = project.get("organization_id") if project else None

        membership_role: str | None = None
        if project:
            membership = _load_project_membership(user_id=user_id, project_id=project_id, sb=admin)
            if membership:
                membership_role = str(membership["membership_role"])
            elif isinstance(organization_id, str):
                org_admin_membership = _load_org_admin_membership(
                    user_id=user_id,
                    organization_id=organization_id,
                    sb=admin,
                )
                if org_admin_membership:
                    membership_role = "organization_admin"

        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        set_span_attributes(
            span,
            {
                "project_id_present": True,
                "organization_id_present": organization_id is not None,
                "membership_role": membership_role,
                "result": "granted" if membership_role is not None else "denied",
                "latency_ms": duration_ms,
            },
        )
        project_access_duration_ms.record(
            duration_ms,
            safe_attributes(
                {
                    "membership_role": membership_role,
                    "result": "granted" if membership_role is not None else "denied",
                    "project_id_present": True,
                }
            ),
        )

        if project is None or membership_role is None:
            _deny_project_access(
                user_id=user_id,
                project_id=project_id,
                organization_id=organization_id if isinstance(organization_id, str) else None,
            )

        return {**project, "membership_role": membership_role}


def require_project_write_access(
    *,
    user_id: str,
    project_id: str,
    allowed_project_roles: Iterable[str] | None = None,
    sb=None,
) -> dict[str, Any]:
    project = require_project_access(user_id=user_id, project_id=project_id, sb=sb)
    membership_role = str(project["membership_role"])
    allowed_roles = set(allowed_project_roles or ("project_admin", "project_editor"))
    if membership_role == "organization_admin" or membership_role in allowed_roles:
        return project
    _deny_project_access(
        user_id=user_id,
        project_id=project_id,
        organization_id=project.get("organization_id"),
    )
