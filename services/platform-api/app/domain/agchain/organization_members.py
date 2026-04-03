from __future__ import annotations

import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException

from app.domain.agchain.organization_access import (
    OWNERS_SYSTEM_GROUP_KIND,
    require_organization_permission,
)
from app.infra.supabase_client import get_supabase_admin


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
INVITE_EXPIRY_DAYS = 7


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _isoformat(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def _normalize_email(value: str) -> str | None:
    normalized = value.strip().lower()
    if not normalized or not EMAIL_RE.match(normalized):
        return None
    return normalized


def _hash_invite_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _load_profiles_by_user_id(*, sb) -> dict[str, dict[str, Any]]:
    profiles = sb.table("profiles").select("*").execute().data or []
    return {
        str(row["id"]): row
        for row in profiles
        if row.get("id")
    }


def _load_groups_for_organization(*, organization_id: str, sb) -> dict[str, dict[str, Any]]:
    groups = (
        sb.table("agchain_permission_groups")
        .select("*")
        .eq("organization_id", organization_id)
        .execute()
        .data
        or []
    )
    return {
        str(row["permission_group_id"]): row
        for row in groups
        if row.get("permission_group_id")
    }


def _load_group_memberships_for_org_members(*, organization_member_ids: set[str], sb) -> list[dict[str, Any]]:
    if not organization_member_ids:
        return []
    memberships = sb.table("agchain_permission_group_memberships").select("*").execute().data or []
    return [
        row
        for row in memberships
        if str(row.get("organization_member_id")) in organization_member_ids
    ]


def _build_group_map(
    *,
    organization_member_ids: set[str],
    groups_by_id: dict[str, dict[str, Any]],
    sb,
) -> dict[str, list[dict[str, Any]]]:
    group_map: dict[str, list[dict[str, Any]]] = {member_id: [] for member_id in organization_member_ids}
    for row in _load_group_memberships_for_org_members(organization_member_ids=organization_member_ids, sb=sb):
        member_id = str(row["organization_member_id"])
        group = groups_by_id.get(str(row.get("permission_group_id")))
        if group is None:
            continue
        group_map.setdefault(member_id, []).append(
            {
                "permission_group_id": str(group["permission_group_id"]),
                "name": str(group["name"]),
                "is_system_group": bool(group.get("is_system_group", False)),
                "system_group_kind": group.get("system_group_kind"),
            }
        )
    for groups in group_map.values():
        groups.sort(key=lambda item: (0 if item["system_group_kind"] == OWNERS_SYSTEM_GROUP_KIND else 1, item["name"].lower()))
    return group_map


def _load_member_row(*, organization_id: str, organization_member_id: str, sb) -> dict[str, Any] | None:
    rows = (
        sb.table("agchain_organization_members")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("organization_member_id", organization_member_id)
        .execute()
        .data
        or []
    )
    return rows[0] if rows else None


def _count_active_owner_members(*, organization_id: str, sb) -> int:
    groups_by_id = _load_groups_for_organization(organization_id=organization_id, sb=sb)
    owner_group_ids = {
        group_id
        for group_id, group in groups_by_id.items()
        if group.get("system_group_kind") == OWNERS_SYSTEM_GROUP_KIND
    }
    if not owner_group_ids:
        return 0

    owner_member_ids = {
        str(row["organization_member_id"])
        for row in (sb.table("agchain_permission_group_memberships").select("*").execute().data or [])
        if str(row.get("permission_group_id")) in owner_group_ids and row.get("organization_member_id")
    }
    if not owner_member_ids:
        return 0

    return sum(
        1
        for row in (sb.table("agchain_organization_members").select("*").execute().data or [])
        if row.get("organization_id") == organization_id
        and row.get("membership_status") == "active"
        and str(row.get("organization_member_id")) in owner_member_ids
    )


def _member_is_owner(*, organization_id: str, organization_member_id: str, sb) -> bool:
    groups_by_id = _load_groups_for_organization(organization_id=organization_id, sb=sb)
    owner_group_ids = {
        group_id
        for group_id, group in groups_by_id.items()
        if group.get("system_group_kind") == OWNERS_SYSTEM_GROUP_KIND
    }
    return any(
        str(row.get("organization_member_id")) == organization_member_id and str(row.get("permission_group_id")) in owner_group_ids
        for row in (sb.table("agchain_permission_group_memberships").select("*").execute().data or [])
    )


def list_organization_members(
    *,
    user_id: str,
    organization_id: str,
    search: str | None = None,
    status: str | None = None,
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    access = require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.members.read",
        sb=admin,
    )

    rows = (
        admin.table("agchain_organization_members")
        .select("*")
        .eq("organization_id", organization_id)
        .execute()
        .data
        or []
    )
    if status in {"active", "disabled"}:
        rows = [row for row in rows if row.get("membership_status") == status]

    profiles_by_user_id = _load_profiles_by_user_id(sb=admin)
    groups_by_id = _load_groups_for_organization(organization_id=organization_id, sb=admin)
    group_map = _build_group_map(
        organization_member_ids={str(row["organization_member_id"]) for row in rows if row.get("organization_member_id")},
        groups_by_id=groups_by_id,
        sb=admin,
    )

    normalized_search = search.strip().lower() if search else ""
    items = []
    for row in rows:
        organization_member_id = str(row["organization_member_id"])
        profile = profiles_by_user_id.get(str(row.get("user_id")), {})
        email = str(profile.get("email") or "")
        display_name = str(profile.get("display_name") or email or "")
        if normalized_search and normalized_search not in email.lower() and normalized_search not in display_name.lower():
            continue
        groups = group_map.get(organization_member_id, [])
        items.append(
            {
                "organization_member_id": organization_member_id,
                "organization_id": str(row["organization_id"]),
                "user_id": str(row["user_id"]),
                "email": email,
                "display_name": display_name,
                "membership_role": str(row["membership_role"]),
                "membership_status": str(row["membership_status"]),
                "created_at": row.get("created_at"),
                "group_count": len(groups),
                "groups": groups,
            }
        )

    return {
        "organization": {
            "organization_id": str(access["organization"]["organization_id"]),
            "organization_slug": str(access["organization"].get("organization_slug") or ""),
            "display_name": str(access["organization"].get("display_name") or ""),
            "is_personal": bool(access["organization"].get("is_personal", False)),
        },
        "items": items,
    }


def create_organization_invites(
    *,
    user_id: str,
    organization_id: str,
    emails: list[str],
    permission_group_ids: list[str],
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.members.invite",
        sb=admin,
    )

    groups_by_id = _load_groups_for_organization(organization_id=organization_id, sb=admin)
    unknown_group_ids = [group_id for group_id in permission_group_ids if group_id not in groups_by_id]
    if unknown_group_ids:
        raise HTTPException(status_code=400, detail="Unknown permission group")

    profiles = _load_profiles_by_user_id(sb=admin)
    member_email_to_id = {
        _normalize_email(str(profile.get("email") or "")): member["organization_member_id"]
        for member in (admin.table("agchain_organization_members").select("*").eq("organization_id", organization_id).execute().data or [])
        for profile in [profiles.get(str(member.get("user_id")), {})]
        if _normalize_email(str(profile.get("email") or "")) is not None
    }
    pending_invites = (
        admin.table("agchain_organization_invites")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("invite_status", "pending")
        .execute()
        .data
        or []
    )
    pending_by_email = {
        str(row["invited_email_normalized"]): row
        for row in pending_invites
        if row.get("invited_email_normalized")
    }

    results = []
    for raw_email in emails:
        normalized_email = _normalize_email(raw_email)
        if normalized_email is None:
            results.append(
                {
                    "email": raw_email,
                    "outcome": "invalid_email",
                    "invite_id": None,
                    "invite_status": None,
                    "expires_at": None,
                    "permission_group_ids": [],
                    "error_code": "invalid_email",
                }
            )
            continue

        if normalized_email in member_email_to_id:
            results.append(
                {
                    "email": normalized_email,
                    "outcome": "already_member",
                    "invite_id": None,
                    "invite_status": None,
                    "expires_at": None,
                    "permission_group_ids": [],
                    "error_code": None,
                }
            )
            continue

        existing_invite = pending_by_email.get(normalized_email)
        if existing_invite is not None:
            results.append(
                {
                    "email": normalized_email,
                    "outcome": "already_pending",
                    "invite_id": str(existing_invite["organization_invite_id"]),
                    "invite_status": str(existing_invite["invite_status"]),
                    "expires_at": existing_invite.get("expires_at"),
                    "permission_group_ids": permission_group_ids,
                    "error_code": None,
                }
            )
            continue

        raw_token = secrets.token_urlsafe(32)
        invite_token_hash = _hash_invite_token(raw_token)
        now = _utcnow()
        expires_at = now + timedelta(days=INVITE_EXPIRY_DAYS)
        inserted = (
            admin.table("agchain_organization_invites")
            .insert(
                {
                    "organization_id": organization_id,
                    "invited_email": normalized_email,
                    "invited_email_normalized": normalized_email,
                    "invite_token_hash": invite_token_hash,
                    "invited_by_user_id": user_id,
                    "invite_status": "pending",
                    "expires_at": _isoformat(expires_at),
                    "accepted_at": None,
                    "revoked_at": None,
                    "created_at": _isoformat(now),
                    "updated_at": _isoformat(now),
                }
            )
            .execute()
            .data[0]
        )
        for permission_group_id in permission_group_ids:
            admin.table("agchain_organization_invite_group_assignments").insert(
                {
                    "organization_invite_id": inserted["organization_invite_id"],
                    "permission_group_id": permission_group_id,
                    "created_at": _isoformat(now),
                }
            ).execute()

        results.append(
            {
                "email": normalized_email,
                "outcome": "invite_created",
                "invite_id": str(inserted["organization_invite_id"]),
                "invite_status": "pending",
                "expires_at": inserted["expires_at"],
                "permission_group_ids": permission_group_ids,
                "error_code": None,
            }
        )

    return {
        "ok": True,
        "organization_id": organization_id,
        "results": results,
    }


def update_organization_membership_status(
    *,
    user_id: str,
    organization_id: str,
    organization_member_id: str,
    membership_status: str,
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.members.remove",
        sb=admin,
    )

    if membership_status not in {"active", "disabled"}:
        raise HTTPException(status_code=400, detail="Invalid membership status")

    member = _load_member_row(organization_id=organization_id, organization_member_id=organization_member_id, sb=admin)
    if member is None:
        raise HTTPException(status_code=404, detail="Organization member not found")

    if membership_status == "disabled" and member.get("membership_status") == "active":
        if _member_is_owner(organization_id=organization_id, organization_member_id=organization_member_id, sb=admin):
            if _count_active_owner_members(organization_id=organization_id, sb=admin) <= 1:
                raise HTTPException(status_code=409, detail="At least one owner must remain active")

    now = _isoformat(_utcnow())
    updated = (
        admin.table("agchain_organization_members")
        .update(
            {
                "membership_status": membership_status,
                "updated_at": now,
            }
        )
        .eq("organization_id", organization_id)
        .eq("organization_member_id", organization_member_id)
        .execute()
        .data
    )
    row = updated[0]
    return {
        "ok": True,
        "member": {
            "organization_member_id": str(row["organization_member_id"]),
            "organization_id": str(row["organization_id"]),
            "user_id": str(row["user_id"]),
            "membership_role": str(row["membership_role"]),
            "membership_status": str(row["membership_status"]),
            "updated_at": row.get("updated_at"),
        },
    }
