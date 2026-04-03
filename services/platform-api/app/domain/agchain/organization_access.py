from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.infra.supabase_client import get_supabase_admin


OWNERS_SYSTEM_GROUP_KIND = "owners"

V1_ORGANIZATION_PERMISSION_DEFINITIONS: tuple[dict[str, Any], ...] = (
    {
        "permission_key": "organization.settings.manage",
        "label": "Manage settings",
        "description": "Manage organization-wide AGChain settings.",
        "user_assignable": True,
    },
    {
        "permission_key": "organization.members.read",
        "label": "Read members",
        "description": "View organization members and group assignments.",
        "user_assignable": True,
    },
    {
        "permission_key": "organization.members.invite",
        "label": "Invite members",
        "description": "Create pending organization invitations.",
        "user_assignable": True,
    },
    {
        "permission_key": "organization.members.remove",
        "label": "Remove members",
        "description": "Disable or reactivate organization memberships.",
        "user_assignable": True,
    },
    {
        "permission_key": "organization.permission_groups.read",
        "label": "Read permission groups",
        "description": "View permission groups and assigned grants.",
        "user_assignable": True,
    },
    {
        "permission_key": "organization.permission_groups.manage",
        "label": "Manage permission groups",
        "description": "Create groups and manage group membership.",
        "user_assignable": True,
    },
)

V1_PROJECT_PERMISSION_DEFINITIONS: tuple[dict[str, Any], ...] = (
    {
        "permission_key": "project.create",
        "label": "Create projects",
        "description": "Create AGChain projects inside this organization.",
        "user_assignable": False,
    },
    {
        "permission_key": "project.read",
        "label": "Read projects",
        "description": "Read AGChain projects inside this organization.",
        "user_assignable": False,
    },
    {
        "permission_key": "project.update",
        "label": "Update projects",
        "description": "Update AGChain projects inside this organization.",
        "user_assignable": False,
    },
    {
        "permission_key": "project.delete",
        "label": "Delete projects",
        "description": "Delete AGChain projects inside this organization.",
        "user_assignable": False,
    },
    {
        "permission_key": "project.manage_access",
        "label": "Manage project access",
        "description": "Manage project membership and project access posture.",
        "user_assignable": False,
    },
)

OWNERS_DEFAULT_PERMISSION_KEYS: frozenset[str] = frozenset(
    definition["permission_key"]
    for definition in (*V1_ORGANIZATION_PERMISSION_DEFINITIONS, *V1_PROJECT_PERMISSION_DEFINITIONS)
)


def get_permission_definitions() -> dict[str, list[dict[str, Any]]]:
    return {
        "organization_permissions": [dict(item) for item in V1_ORGANIZATION_PERMISSION_DEFINITIONS],
        "project_permissions": [dict(item) for item in V1_PROJECT_PERMISSION_DEFINITIONS],
        "protected_system_groups": [
            {
                "system_group_kind": OWNERS_SYSTEM_GROUP_KIND,
                "name": "Owners",
                "deletable": False,
                "last_member_removable": False,
            }
        ],
    }


def _load_organization_row(*, organization_id: str, sb) -> dict[str, Any] | None:
    return (
        sb.table("agchain_organizations")
        .select("*")
        .eq("organization_id", organization_id)
        .maybe_single()
        .execute()
        .data
    )


def load_active_organization_membership(*, user_id: str, organization_id: str, sb=None) -> dict[str, Any] | None:
    admin = sb or get_supabase_admin()
    return (
        admin.table("agchain_organization_members")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("user_id", user_id)
        .eq("membership_status", "active")
        .maybe_single()
        .execute()
        .data
    )


def _load_permission_keys_for_member(*, organization_id: str, organization_member_id: str, sb) -> set[str]:
    group_memberships = (
        sb.table("agchain_permission_group_memberships")
        .select("*")
        .eq("organization_member_id", organization_member_id)
        .execute()
        .data
        or []
    )
    if not group_memberships:
        return set()

    group_ids = {
        row["permission_group_id"]
        for row in group_memberships
        if row.get("permission_group_id")
    }
    if not group_ids:
        return set()

    groups = (
        sb.table("agchain_permission_groups")
        .select("*")
        .eq("organization_id", organization_id)
        .execute()
        .data
        or []
    )
    valid_group_ids = {
        row["permission_group_id"]
        for row in groups
        if row.get("permission_group_id") in group_ids
    }
    if not valid_group_ids:
        return set()

    grants = sb.table("agchain_permission_group_grants").select("*").execute().data or []
    return {
        str(row["permission_key"])
        for row in grants
        if row.get("permission_group_id") in valid_group_ids and row.get("permission_key")
    }


def require_organization_membership(*, user_id: str, organization_id: str, sb=None) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    organization = _load_organization_row(organization_id=organization_id, sb=admin)
    membership = load_active_organization_membership(
        user_id=user_id,
        organization_id=organization_id,
        sb=admin,
    )
    if organization is None or membership is None:
        raise HTTPException(status_code=403, detail="Organization access denied")

    permission_keys = _load_permission_keys_for_member(
        organization_id=organization_id,
        organization_member_id=str(membership["organization_member_id"]),
        sb=admin,
    )

    return {
        "organization": organization,
        "organization_member": membership,
        "permission_keys": permission_keys,
    }


def require_organization_permission(
    *,
    user_id: str,
    organization_id: str,
    permission_key: str,
    sb=None,
) -> dict[str, Any]:
    context = require_organization_membership(user_id=user_id, organization_id=organization_id, sb=sb)
    if permission_key not in context["permission_keys"]:
        raise HTTPException(status_code=403, detail="Organization access denied")
    return context
