from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

from app.domain.agchain.project_access import (
    load_accessible_projects,
    require_project_access,
    require_project_write_access,
)
from app.infra.supabase_client import get_supabase_admin


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _slugify_project(value: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in value.strip())
    pieces = [piece for piece in cleaned.split("-") if piece]
    if not pieces:
        raise HTTPException(status_code=422, detail="project_name must contain at least one letter or number")
    return "-".join(pieces)


def _list_organization_memberships(*, user_id: str, sb) -> list[dict[str, Any]]:
    return (
        sb.table("agchain_organization_members")
        .select("*")
        .eq("user_id", user_id)
        .eq("membership_status", "active")
        .execute()
        .data
        or []
    )


def _load_organization_row(*, organization_id: str, sb) -> dict[str, Any] | None:
    return (
        sb.table("agchain_organizations")
        .select("*")
        .eq("organization_id", organization_id)
        .maybe_single()
        .execute()
        .data
    )


def _resolve_target_organization(*, user_id: str, organization_id: str | None, sb) -> dict[str, Any]:
    memberships = _list_organization_memberships(user_id=user_id, sb=sb)
    organizations = (
        sb.table("agchain_organizations")
        .select("*")
        .execute()
        .data
        or []
    )
    organizations_by_id = {
        row["organization_id"]: row
        for row in organizations
        if row.get("organization_id")
    }
    accessible = [
        {**organizations_by_id[row["organization_id"]], "membership_role": row["membership_role"]}
        for row in memberships
        if row.get("organization_id") in organizations_by_id
    ]

    if organization_id is not None:
        for row in accessible:
            if row["organization_id"] == organization_id:
                return row
        raise HTTPException(status_code=403, detail="Organization access denied")

    if not accessible:
        raise HTTPException(status_code=403, detail="Organization access denied")

    personal = [
        row
        for row in accessible
        if bool(row.get("is_personal")) and row.get("owner_user_id") == user_id
    ]
    if personal:
        return personal[0]
    return accessible[0]


def _project_primary_benchmarks(*, project_ids: list[str], sb) -> dict[str, dict[str, Any]]:
    if not project_ids:
        return {}
    rows = (
        sb.table("agchain_benchmarks")
        .select("*")
        .in_("project_id", project_ids)
        .execute()
        .data
        or []
    )
    versions_by_id: dict[str, dict[str, Any]] = {}
    version_ids = [
        row.get("current_draft_version_id") or row.get("current_published_version_id")
        for row in rows
        if row.get("current_draft_version_id") or row.get("current_published_version_id")
    ]
    if version_ids:
        version_rows = (
            sb.table("agchain_benchmark_versions")
            .select("*")
            .in_("benchmark_version_id", version_ids)
            .execute()
            .data
            or []
        )
        versions_by_id = {row["benchmark_version_id"]: row for row in version_rows}

    primary: dict[str, dict[str, Any]] = {}
    for row in rows:
        project_id = row.get("project_id")
        if not isinstance(project_id, str) or project_id in primary:
            continue
        version_id = row.get("current_draft_version_id") or row.get("current_published_version_id")
        version = versions_by_id.get(version_id) if version_id else None
        primary[project_id] = {
            "benchmark_id": row["benchmark_id"],
            "benchmark_slug": row["benchmark_slug"],
            "benchmark_name": row["benchmark_name"],
            "current_version_id": version_id,
            "current_version_label": (version or {}).get("version_label"),
        }
    return primary


def _resolve_unique_project_slug(
    *,
    organization_id: str,
    project_slug: str | None,
    project_name: str,
    exclude_project_id: str | None = None,
    sb,
) -> str:
    base_slug = _slugify_project(project_slug or project_name)
    project_rows = (
        sb.table("user_projects")
        .select("project_id, project_slug")
        .eq("organization_id", organization_id)
        .execute()
        .data
        or []
    )
    taken = {
        str(row["project_slug"])
        for row in project_rows
        if row.get("project_slug") and row.get("project_id") != exclude_project_id
    }
    if base_slug not in taken:
        return base_slug

    suffix = 2
    while True:
        suffix_text = f"-{suffix}"
        candidate = f"{base_slug[: max(1, 120 - len(suffix_text))]}{suffix_text}"
        if candidate not in taken:
            return candidate
        suffix += 1


def list_organizations(*, user_id: str) -> list[dict[str, Any]]:
    sb = get_supabase_admin()
    memberships = _list_organization_memberships(user_id=user_id, sb=sb)
    if not memberships:
        return []

    organization_ids = [row["organization_id"] for row in memberships if row.get("organization_id")]
    organization_rows = (
        sb.table("agchain_organizations")
        .select("*")
        .in_("organization_id", organization_ids)
        .execute()
        .data
        or []
    )
    project_rows = (
        sb.table("user_projects")
        .select("project_id, organization_id")
        .in_("organization_id", organization_ids)
        .execute()
        .data
        or []
    )
    project_counts: dict[str, int] = {}
    for row in project_rows:
        organization_id = row.get("organization_id")
        if isinstance(organization_id, str):
            project_counts[organization_id] = project_counts.get(organization_id, 0) + 1

    membership_by_org = {
        row["organization_id"]: row["membership_role"]
        for row in memberships
        if row.get("organization_id") and row.get("membership_role")
    }
    items = [
        {
            "organization_id": row["organization_id"],
            "organization_slug": row["organization_slug"],
            "display_name": row["display_name"],
            "membership_role": membership_by_org[row["organization_id"]],
            "is_personal": bool(row.get("is_personal", False)),
            "project_count": project_counts.get(row["organization_id"], 0),
        }
        for row in organization_rows
        if row.get("organization_id") in membership_by_org
    ]
    return sorted(items, key=lambda item: (not item["is_personal"], item["display_name"].lower()))


def list_projects(
    *,
    user_id: str,
    organization_id: str | None = None,
    search: str | None = None,
) -> list[dict[str, Any]]:
    sb = get_supabase_admin()
    target_organization = _resolve_target_organization(user_id=user_id, organization_id=organization_id, sb=sb)
    project_rows = load_accessible_projects(
        user_id=user_id,
        organization_id=target_organization["organization_id"],
        sb=sb,
    )
    primary_benchmarks = _project_primary_benchmarks(
        project_ids=[row["project_id"] for row in project_rows if row.get("project_id")],
        sb=sb,
    )
    needle = (search or "").strip().lower()
    items: list[dict[str, Any]] = []
    for row in project_rows:
        item = {
            "project_id": row["project_id"],
            "organization_id": row["organization_id"],
            "project_slug": row.get("project_slug"),
            "project_name": row["project_name"],
            "description": row.get("description") or "",
            "membership_role": row["membership_role"],
            "updated_at": row.get("updated_at"),
            "primary_benchmark_slug": (primary_benchmarks.get(row["project_id"]) or {}).get("benchmark_slug"),
            "primary_benchmark_name": (primary_benchmarks.get(row["project_id"]) or {}).get("benchmark_name"),
        }
        haystack = " ".join(
            str(part)
            for part in (item["project_slug"], item["project_name"], item["description"])
            if part
        ).lower()
        if needle and needle not in haystack:
            continue
        items.append(item)
    return sorted(items, key=lambda item: (item["project_name"].lower(), item["project_id"]))


def create_project(*, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    sb = get_supabase_admin()
    organization = _resolve_target_organization(
        user_id=user_id,
        organization_id=payload.get("organization_id"),
        sb=sb,
    )
    project_name = (payload.get("project_name") or "").strip()
    if not project_name:
        raise HTTPException(status_code=422, detail="project_name is required")

    description = (payload.get("description") or "").strip()
    now = _utc_now_iso()
    project_slug = _resolve_unique_project_slug(
        organization_id=organization["organization_id"],
        project_slug=payload.get("project_slug"),
        project_name=project_name,
        sb=sb,
    )

    result = (
        sb.rpc(
            "create_agchain_project_atomic",
            {
                "p_user_id": user_id,
                "p_organization_id": organization["organization_id"],
                "p_project_name": project_name,
                "p_project_slug": project_slug,
                "p_description": description,
                "p_seed_initial_benchmark": payload.get("seed_initial_benchmark", True),
                "p_initial_benchmark_name": payload.get("initial_benchmark_name"),
                "p_now": now,
            },
        )
        .execute()
        .data
    )
    if not isinstance(result, dict) or not result.get("project_id"):
        raise HTTPException(status_code=500, detail="Failed to create project")

    return {
        "project_id": result["project_id"],
        "project_slug": project_slug,
        "primary_benchmark_slug": result.get("primary_benchmark_slug"),
        "redirect_path": f"/app/agchain/projects/{project_slug}",
    }


def get_project(*, user_id: str, project_id: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    project = require_project_access(user_id=user_id, project_id=project_id, sb=sb)
    primary_benchmark = _project_primary_benchmarks(project_ids=[project_id], sb=sb).get(project_id)
    return {
        "project": {
            "project_id": project["project_id"],
            "organization_id": project.get("organization_id"),
            "project_slug": project.get("project_slug"),
            "project_name": project["project_name"],
            "description": project.get("description") or "",
            "membership_role": project["membership_role"],
            "updated_at": project.get("updated_at"),
        },
        "primary_benchmark": primary_benchmark,
        "settings_partitions": ["project", "organization", "personal"],
    }


def update_project(*, user_id: str, project_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    sb = get_supabase_admin()
    project = require_project_write_access(
        user_id=user_id,
        project_id=project_id,
        allowed_project_roles=("project_admin",),
        sb=sb,
    )
    update_payload: dict[str, Any] = {}
    if "project_name" in payload and payload["project_name"] is not None:
        project_name = str(payload["project_name"]).strip()
        if not project_name:
            raise HTTPException(status_code=422, detail="project_name is required")
        update_payload["project_name"] = project_name
    if "description" in payload and payload["description"] is not None:
        update_payload["description"] = str(payload["description"]).strip()
    if "project_slug" in payload and payload["project_slug"] is not None:
        update_payload["project_slug"] = _resolve_unique_project_slug(
            organization_id=project["organization_id"],
            project_slug=str(payload["project_slug"]),
            project_name=update_payload.get("project_name") or project["project_name"],
            exclude_project_id=project_id,
            sb=sb,
        )
    elif "project_name" in update_payload:
        update_payload["project_slug"] = _resolve_unique_project_slug(
            organization_id=project["organization_id"],
            project_slug=project.get("project_slug"),
            project_name=update_payload["project_name"],
            exclude_project_id=project_id,
            sb=sb,
        )

    if update_payload:
        update_payload["updated_at"] = _utc_now_iso()
        sb.table("user_projects").update(update_payload).eq("project_id", project_id).execute()
    return {"ok": True, "project_id": project_id}
