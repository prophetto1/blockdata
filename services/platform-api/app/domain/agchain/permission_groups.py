from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from app.domain.agchain.organization_access import (
    OWNERS_SYSTEM_GROUP_KIND,
    V1_ORGANIZATION_PERMISSION_DEFINITIONS,
    get_permission_definitions,
    require_organization_permission,
)
from app.infra.supabase_client import get_supabase_admin


GROUP_POLICY_NOTICE = (
    "Custom groups expose only organization-level grant editing in V1. "
    "Protected system groups may carry seeded project-level grants."
)
GROUP_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _slugify_group_name(value: str) -> str:
    slug = GROUP_SLUG_RE.sub("-", value.strip().lower()).strip("-")
    return slug or "permission-group"


def _user_assignable_organization_permission_keys() -> set[str]:
    return {
        str(item["permission_key"])
        for item in V1_ORGANIZATION_PERMISSION_DEFINITIONS
        if bool(item.get("user_assignable"))
    }


def _load_groups_for_organization(*, organization_id: str, sb) -> list[dict[str, Any]]:
    return (
        sb.table("agchain_permission_groups")
        .select("*")
        .eq("organization_id", organization_id)
        .execute()
        .data
        or []
    )


def _load_group_by_id(*, organization_id: str, permission_group_id: str, sb) -> dict[str, Any] | None:
    groups = _load_groups_for_organization(organization_id=organization_id, sb=sb)
    for group in groups:
        if str(group.get("permission_group_id")) == permission_group_id:
            return group
    return None


def _load_group_grants(*, permission_group_ids: set[str], sb) -> list[dict[str, Any]]:
    if not permission_group_ids:
        return []
    grants = sb.table("agchain_permission_group_grants").select("*").execute().data or []
    return [
        row
        for row in grants
        if str(row.get("permission_group_id")) in permission_group_ids
    ]


def _load_group_memberships(*, permission_group_ids: set[str], sb) -> list[dict[str, Any]]:
    if not permission_group_ids:
        return []
    memberships = sb.table("agchain_permission_group_memberships").select("*").execute().data or []
    return [
        row
        for row in memberships
        if str(row.get("permission_group_id")) in permission_group_ids
    ]


def _load_members_for_organization(*, organization_id: str, sb) -> dict[str, dict[str, Any]]:
    rows = (
        sb.table("agchain_organization_members")
        .select("*")
        .eq("organization_id", organization_id)
        .execute()
        .data
        or []
    )
    return {
        str(row["organization_member_id"]): row
        for row in rows
        if row.get("organization_member_id")
    }


def _load_profiles_by_user_id(*, sb) -> dict[str, dict[str, Any]]:
    rows = sb.table("profiles").select("*").execute().data or []
    return {
        str(row["id"]): row
        for row in rows
        if row.get("id")
    }


def _active_owner_count(*, organization_id: str, sb) -> int:
    groups = _load_groups_for_organization(organization_id=organization_id, sb=sb)
    owner_group_ids = {
        str(group["permission_group_id"])
        for group in groups
        if group.get("system_group_kind") == OWNERS_SYSTEM_GROUP_KIND
    }
    if not owner_group_ids:
        return 0

    owner_member_ids = {
        str(row["organization_member_id"])
        for row in _load_group_memberships(permission_group_ids=owner_group_ids, sb=sb)
        if row.get("organization_member_id")
    }
    if not owner_member_ids:
        return 0

    members_by_id = _load_members_for_organization(organization_id=organization_id, sb=sb)
    return sum(
        1
        for member_id in owner_member_ids
        if members_by_id.get(member_id, {}).get("membership_status") == "active"
    )


def get_permission_group_definitions(*, user_id: str, organization_id: str, sb=None) -> dict[str, list[dict[str, Any]]]:
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.permission_groups.read",
        sb=sb,
    )
    return get_permission_definitions()


def list_permission_groups(
    *,
    user_id: str,
    organization_id: str,
    search: str | None = None,
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    access = require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.permission_groups.read",
        sb=admin,
    )

    groups = _load_groups_for_organization(organization_id=organization_id, sb=admin)
    normalized_search = search.strip().lower() if search else ""
    if normalized_search:
        groups = [
            group
            for group in groups
            if normalized_search in str(group.get("name") or "").lower()
        ]

    group_ids = {str(group["permission_group_id"]) for group in groups if group.get("permission_group_id")}
    memberships = _load_group_memberships(permission_group_ids=group_ids, sb=admin)
    grants = _load_group_grants(permission_group_ids=group_ids, sb=admin)

    items = []
    for group in sorted(groups, key=lambda item: (0 if item.get("is_system_group") else 1, str(item.get("name") or "").lower())):
        permission_group_id = str(group["permission_group_id"])
        group_memberships = [
            row
            for row in memberships
            if str(row.get("permission_group_id")) == permission_group_id
        ]
        group_grants = [
            row
            for row in grants
            if str(row.get("permission_group_id")) == permission_group_id
        ]
        items.append(
            {
                "permission_group_id": permission_group_id,
                "organization_id": str(group["organization_id"]),
                "name": str(group["name"]),
                "group_slug": str(group["group_slug"]),
                "description": str(group.get("description") or ""),
                "is_system_group": bool(group.get("is_system_group", False)),
                "system_group_kind": group.get("system_group_kind"),
                "member_count": len(group_memberships),
                "organization_permission_count": sum(1 for row in group_grants if row.get("scope_type") == "organization"),
                "project_permission_count": sum(1 for row in group_grants if row.get("scope_type") == "project"),
                "created_at": group.get("created_at"),
                "updated_at": group.get("updated_at"),
            }
        )

    return {
        "organization": {
            "organization_id": str(access["organization"]["organization_id"]),
            "organization_slug": str(access["organization"].get("organization_slug") or ""),
            "display_name": str(access["organization"].get("display_name") or ""),
        },
        "items": items,
    }


def create_permission_group(
    *,
    user_id: str,
    organization_id: str,
    name: str,
    description: str,
    permission_keys: list[str],
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.permission_groups.manage",
        sb=admin,
    )

    valid_permission_keys = _user_assignable_organization_permission_keys()
    invalid_keys = [key for key in permission_keys if key not in valid_permission_keys]
    if invalid_keys:
        raise HTTPException(status_code=400, detail="Invalid permission key")

    group_slug = _slugify_group_name(name)
    existing_groups = _load_groups_for_organization(organization_id=organization_id, sb=admin)
    if any(str(group.get("group_slug")) == group_slug for group in existing_groups):
        raise HTTPException(status_code=409, detail="Permission group already exists")

    now = _utcnow_iso()
    permission_group_id = str(uuid4())
    inserted_group = (
        admin.table("agchain_permission_groups")
        .insert(
            {
                "permission_group_id": permission_group_id,
                "organization_id": organization_id,
                "group_slug": group_slug,
                "name": name.strip(),
                "description": description.strip(),
                "is_system_group": False,
                "system_group_kind": None,
                "created_at": now,
                "updated_at": now,
            }
        )
        .execute()
        .data[0]
    )

    for permission_key in permission_keys:
        admin.table("agchain_permission_group_grants").insert(
            {
                "permission_group_grant_id": str(uuid4()),
                "permission_group_id": permission_group_id,
                "scope_type": "organization",
                "permission_key": permission_key,
                "created_at": now,
            }
        ).execute()

    return {
        "ok": True,
        "group": {
            "permission_group_id": permission_group_id,
            "organization_id": str(inserted_group["organization_id"]),
            "name": str(inserted_group["name"]),
            "group_slug": str(inserted_group["group_slug"]),
            "description": str(inserted_group.get("description") or ""),
            "is_system_group": False,
            "organization_permission_count": len(permission_keys),
            "project_permission_count": 0,
            "created_at": inserted_group.get("created_at"),
            "updated_at": inserted_group.get("updated_at"),
        },
    }


def get_permission_group(
    *,
    user_id: str,
    organization_id: str,
    permission_group_id: str,
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.permission_groups.read",
        sb=admin,
    )

    group = _load_group_by_id(organization_id=organization_id, permission_group_id=permission_group_id, sb=admin)
    if group is None:
        raise HTTPException(status_code=404, detail="Permission group not found")

    grants = _load_group_grants(permission_group_ids={permission_group_id}, sb=admin)
    organization_grants = sorted(
        str(row["permission_key"])
        for row in grants
        if str(row.get("permission_group_id")) == permission_group_id and row.get("scope_type") == "organization"
    )
    project_grants = sorted(
        str(row["permission_key"])
        for row in grants
        if str(row.get("permission_group_id")) == permission_group_id and row.get("scope_type") == "project"
    )

    return {
        "group": {
            "permission_group_id": str(group["permission_group_id"]),
            "organization_id": str(group["organization_id"]),
            "name": str(group["name"]),
            "group_slug": str(group["group_slug"]),
            "description": str(group.get("description") or ""),
            "is_system_group": bool(group.get("is_system_group", False)),
            "system_group_kind": group.get("system_group_kind"),
        },
        "grants": {
            "organization": organization_grants,
            "project": project_grants,
        },
        "group_policy_notice": GROUP_POLICY_NOTICE,
    }


def list_permission_group_members(
    *,
    user_id: str,
    organization_id: str,
    permission_group_id: str,
    search: str | None = None,
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.permission_groups.read",
        sb=admin,
    )

    group = _load_group_by_id(organization_id=organization_id, permission_group_id=permission_group_id, sb=admin)
    if group is None:
        raise HTTPException(status_code=404, detail="Permission group not found")

    members_by_id = _load_members_for_organization(organization_id=organization_id, sb=admin)
    profiles_by_user_id = _load_profiles_by_user_id(sb=admin)
    normalized_search = search.strip().lower() if search else ""

    items = []
    for row in _load_group_memberships(permission_group_ids={permission_group_id}, sb=admin):
        member = members_by_id.get(str(row.get("organization_member_id")))
        if member is None:
            continue
        profile = profiles_by_user_id.get(str(member.get("user_id")), {})
        email = str(profile.get("email") or "")
        display_name = str(profile.get("display_name") or email or "")
        if normalized_search and normalized_search not in email.lower() and normalized_search not in display_name.lower():
            continue
        items.append(
            {
                "organization_member_id": str(member["organization_member_id"]),
                "user_id": str(member["user_id"]),
                "email": email,
                "display_name": display_name,
                "membership_role": str(member["membership_role"]),
                "membership_status": str(member["membership_status"]),
                "created_at": member.get("created_at"),
            }
        )

    return {
        "group": {
            "permission_group_id": str(group["permission_group_id"]),
            "name": str(group["name"]),
            "is_system_group": bool(group.get("is_system_group", False)),
        },
        "items": items,
    }


def add_permission_group_members(
    *,
    user_id: str,
    organization_id: str,
    permission_group_id: str,
    organization_member_ids: list[str],
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.permission_groups.manage",
        sb=admin,
    )

    group = _load_group_by_id(organization_id=organization_id, permission_group_id=permission_group_id, sb=admin)
    if group is None:
        raise HTTPException(status_code=404, detail="Permission group not found")

    members_by_id = _load_members_for_organization(organization_id=organization_id, sb=admin)
    unknown_member_ids = [member_id for member_id in organization_member_ids if member_id not in members_by_id]
    if unknown_member_ids:
        raise HTTPException(status_code=404, detail="Organization member not found")

    existing_memberships = _load_group_memberships(permission_group_ids={permission_group_id}, sb=admin)
    existing_member_ids = {
        str(row["organization_member_id"])
        for row in existing_memberships
        if row.get("organization_member_id")
    }

    now = _utcnow_iso()
    added_items = []
    already_present_count = 0
    for organization_member_id in organization_member_ids:
        if organization_member_id in existing_member_ids:
            already_present_count += 1
            continue
        inserted = (
            admin.table("agchain_permission_group_memberships")
            .insert(
                {
                    "permission_group_membership_id": str(uuid4()),
                    "permission_group_id": permission_group_id,
                    "organization_member_id": organization_member_id,
                    "created_at": now,
                }
            )
            .execute()
            .data[0]
        )
        added_items.append(
            {
                "organization_member_id": str(inserted["organization_member_id"]),
                "permission_group_id": str(inserted["permission_group_id"]),
            }
        )

    return {
        "ok": True,
        "added_count": len(added_items),
        "already_present_count": already_present_count,
        "items": added_items,
    }


def remove_permission_group_member(
    *,
    user_id: str,
    organization_id: str,
    permission_group_id: str,
    organization_member_id: str,
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.permission_groups.manage",
        sb=admin,
    )

    group = _load_group_by_id(organization_id=organization_id, permission_group_id=permission_group_id, sb=admin)
    if group is None:
        raise HTTPException(status_code=404, detail="Permission group not found")

    members_by_id = _load_members_for_organization(organization_id=organization_id, sb=admin)
    member = members_by_id.get(organization_member_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Organization member not found")

    if (
        group.get("system_group_kind") == OWNERS_SYSTEM_GROUP_KIND
        and str(member.get("membership_status")) == "active"
        and _active_owner_count(organization_id=organization_id, sb=admin) <= 1
    ):
        raise HTTPException(status_code=409, detail="At least one owner must remain active")

    deleted = (
        admin.table("agchain_permission_group_memberships")
        .delete()
        .eq("permission_group_id", permission_group_id)
        .eq("organization_member_id", organization_member_id)
        .execute()
        .data
    )
    return {
        "ok": True,
        "removed": bool(deleted),
    }
