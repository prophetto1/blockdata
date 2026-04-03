from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends, Query
from opentelemetry import metrics, trace
from pydantic import BaseModel, Field

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.organization_members import (
    create_organization_invites,
    list_organization_members,
    update_organization_membership_status,
)
from app.domain.agchain.permission_groups import (
    add_permission_group_members,
    create_permission_group,
    get_permission_group,
    get_permission_group_definitions,
    list_permission_group_members,
    list_permission_groups,
    remove_permission_group_member,
)
from app.observability.contract import safe_attributes, set_span_attributes


router = APIRouter(prefix="/agchain/settings/organizations/{organization_id}", tags=["agchain-settings"])
logger = logging.getLogger("agchain-settings")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

members_list_counter = meter.create_counter("platform.agchain.settings.members.list.count")
members_invite_counter = meter.create_counter("platform.agchain.settings.members.invite.count")
members_update_counter = meter.create_counter("platform.agchain.settings.members.update.count")
permission_groups_list_counter = meter.create_counter("platform.agchain.settings.permission_groups.list.count")
permission_groups_create_counter = meter.create_counter("platform.agchain.settings.permission_groups.create.count")
permission_groups_members_add_counter = meter.create_counter("platform.agchain.settings.permission_groups.members.add.count")
permission_groups_members_remove_counter = meter.create_counter("platform.agchain.settings.permission_groups.members.remove.count")
members_list_duration_ms = meter.create_histogram("platform.agchain.settings.members.list.duration_ms")
permission_groups_list_duration_ms = meter.create_histogram("platform.agchain.settings.permission_groups.list.duration_ms")


class OrganizationMemberInvitationsRequest(BaseModel):
    emails: list[str] = Field(min_length=1)
    permission_group_ids: list[str] = Field(default_factory=list)


class OrganizationMemberStatusUpdateRequest(BaseModel):
    membership_status: str


class PermissionGroupCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    permission_keys: list[str] = Field(default_factory=list)


class PermissionGroupMembersAddRequest(BaseModel):
    organization_member_ids: list[str] = Field(min_length=1)


@router.get("/permission-definitions", summary="List AGChain permission definitions")
async def get_permission_definitions_route(
    organization_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    return get_permission_group_definitions(
        user_id=auth.user_id,
        organization_id=organization_id,
    )


@router.get("/members", summary="List AGChain organization members")
async def list_organization_members_route(
    organization_id: str,
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.settings.members.list") as span:
        result = list_organization_members(
            user_id=auth.user_id,
            organization_id=organization_id,
            search=search,
            status=status,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "organization_id_present": True,
            "row_count": len(result["items"]),
            "latency_ms": duration_ms,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        members_list_counter.add(1, safe_attributes(attrs))
        members_list_duration_ms.record(duration_ms, safe_attributes(attrs))
        return result


@router.post("/member-invitations", summary="Create pending AGChain organization invitations")
async def create_organization_member_invitations_route(
    organization_id: str,
    body: OrganizationMemberInvitationsRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.settings.members.invite") as span:
        result = create_organization_invites(
            user_id=auth.user_id,
            organization_id=organization_id,
            emails=body.emails,
            permission_group_ids=body.permission_group_ids,
        )
        outcome_counts = {
            "invite_created_count": sum(1 for item in result["results"] if item["outcome"] == "invite_created"),
            "already_pending_count": sum(1 for item in result["results"] if item["outcome"] == "already_pending"),
            "already_member_count": sum(1 for item in result["results"] if item["outcome"] == "already_member"),
            "invalid_email_count": sum(1 for item in result["results"] if item["outcome"] == "invalid_email"),
        }
        attrs = {
            "organization_id_present": True,
            "email_count": len(body.emails),
            **outcome_counts,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        members_invite_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.settings.members.invite.completed",
            extra=safe_attributes(attrs),
        )
        return result


@router.patch("/members/{organization_member_id}", summary="Update AGChain organization membership status")
async def update_organization_membership_status_route(
    organization_id: str,
    organization_member_id: str,
    body: OrganizationMemberStatusUpdateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.settings.members.update") as span:
        result = update_organization_membership_status(
            user_id=auth.user_id,
            organization_id=organization_id,
            organization_member_id=organization_member_id,
            membership_status=body.membership_status,
        )
        attrs = {
            "organization_id_present": True,
            "organization_member_id_present": True,
            "membership_status": body.membership_status,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        members_update_counter.add(1, safe_attributes(attrs))
        return result


@router.get("/permission-groups", summary="List AGChain organization permission groups")
async def list_permission_groups_route(
    organization_id: str,
    search: str | None = Query(default=None),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.settings.permission_groups.list") as span:
        result = list_permission_groups(
            user_id=auth.user_id,
            organization_id=organization_id,
            search=search,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "organization_id_present": True,
            "row_count": len(result["items"]),
            "latency_ms": duration_ms,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        permission_groups_list_counter.add(1, safe_attributes(attrs))
        permission_groups_list_duration_ms.record(duration_ms, safe_attributes(attrs))
        return result


@router.post("/permission-groups", summary="Create an AGChain organization permission group")
async def create_permission_group_route(
    organization_id: str,
    body: PermissionGroupCreateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.settings.permission_groups.create") as span:
        result = create_permission_group(
            user_id=auth.user_id,
            organization_id=organization_id,
            name=body.name,
            description=body.description,
            permission_keys=body.permission_keys,
        )
        attrs = {
            "organization_id_present": True,
            "permission_key_count": len(body.permission_keys),
            "result": "success",
        }
        set_span_attributes(span, attrs)
        permission_groups_create_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.settings.permission_groups.created",
            extra={
                "permission_group_id": result["group"]["permission_group_id"],
                "is_system_group": result["group"]["is_system_group"],
                **safe_attributes(attrs),
            },
        )
        return result


@router.get("/permission-groups/{permission_group_id}", summary="Get AGChain organization permission group detail")
async def get_permission_group_route(
    organization_id: str,
    permission_group_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.settings.permission_groups.get") as span:
        result = get_permission_group(
            user_id=auth.user_id,
            organization_id=organization_id,
            permission_group_id=permission_group_id,
        )
        attrs = {
            "organization_id_present": True,
            "permission_group_id_present": True,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        return result


@router.get("/permission-groups/{permission_group_id}/members", summary="List AGChain permission group members")
async def list_permission_group_members_route(
    organization_id: str,
    permission_group_id: str,
    search: str | None = Query(default=None),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.settings.permission_groups.members.list") as span:
        result = list_permission_group_members(
            user_id=auth.user_id,
            organization_id=organization_id,
            permission_group_id=permission_group_id,
            search=search,
        )
        attrs = {
            "organization_id_present": True,
            "permission_group_id_present": True,
            "row_count": len(result["items"]),
            "result": "success",
        }
        set_span_attributes(span, attrs)
        return result


@router.post("/permission-groups/{permission_group_id}/members", summary="Add AGChain permission group members")
async def add_permission_group_members_route(
    organization_id: str,
    permission_group_id: str,
    body: PermissionGroupMembersAddRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.settings.permission_groups.members.add") as span:
        result = add_permission_group_members(
            user_id=auth.user_id,
            organization_id=organization_id,
            permission_group_id=permission_group_id,
            organization_member_ids=body.organization_member_ids,
        )
        attrs = {
            "organization_id_present": True,
            "permission_group_id_present": True,
            "requested_member_count": len(body.organization_member_ids),
            "added_count": result["added_count"],
            "already_present_count": result["already_present_count"],
            "result": "success",
        }
        set_span_attributes(span, attrs)
        permission_groups_members_add_counter.add(1, safe_attributes(attrs))
        return result


@router.delete("/permission-groups/{permission_group_id}/members/{organization_member_id}", summary="Remove AGChain permission group member")
async def remove_permission_group_member_route(
    organization_id: str,
    permission_group_id: str,
    organization_member_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.settings.permission_groups.members.remove") as span:
        result = remove_permission_group_member(
            user_id=auth.user_id,
            organization_id=organization_id,
            permission_group_id=permission_group_id,
            organization_member_id=organization_member_id,
        )
        attrs = {
            "organization_id_present": True,
            "permission_group_id_present": True,
            "organization_member_id_present": True,
            "removed": result["removed"],
            "result": "success",
        }
        set_span_attributes(span, attrs)
        permission_groups_members_remove_counter.add(1, safe_attributes(attrs))
        return result
