from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.domain.agchain.benchmark_registry import _utc_now_iso
from app.domain.agchain.project_access import require_project_access
from app.domain.agchain.project_access import require_project_write_access
from app.infra.supabase_client import get_supabase_admin

from .tool_catalog import list_builtin_tools
from .tool_resolution import preview_tool_definition


def _load_project_tool_rows(*, sb, project_id: str) -> list[dict[str, Any]]:
    result = (
        sb.table("agchain_tools")
        .select("*")
        .eq("project_id", project_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data or []


def _load_tool_versions(*, sb) -> list[dict[str, Any]]:
    result = sb.table("agchain_tool_versions").select("*").order("created_at", desc=True).execute()
    return result.data or []


def _load_versions_for_tool(*, sb, tool_id: str) -> list[dict[str, Any]]:
    result = sb.table("agchain_tool_versions").select("*").eq("tool_id", tool_id).order("created_at", desc=True).execute()
    return result.data or []


def _load_tool_row(*, sb, project_id: str, tool_id: str) -> dict[str, Any]:
    tool = (
        sb.table("agchain_tools")
        .select("*")
        .eq("project_id", project_id)
        .eq("tool_id", tool_id)
        .maybe_single()
        .execute()
        .data
    )
    if tool is None:
        raise HTTPException(status_code=404, detail="AG chain tool not found")
    return tool


def _load_tool_version_row(*, sb, tool_id: str, tool_version_id: str) -> dict[str, Any]:
    version = (
        sb.table("agchain_tool_versions")
        .select("*")
        .eq("tool_id", tool_id)
        .eq("tool_version_id", tool_version_id)
        .maybe_single()
        .execute()
        .data
    )
    if version is None:
        raise HTTPException(status_code=404, detail="AG chain tool version not found")
    return version


def _select_latest_version(tool: dict[str, Any], versions_by_tool: dict[str, list[dict[str, Any]]]) -> dict[str, Any] | None:
    versions = versions_by_tool.get(str(tool["tool_id"]), [])
    latest_version_id = tool.get("latest_version_id")
    if isinstance(latest_version_id, str) and latest_version_id:
        for version in versions:
            if version.get("tool_version_id") == latest_version_id:
                return version
    return versions[0] if versions else None


def _project_tool_list_item(tool: dict[str, Any], latest_version: dict[str, Any] | None) -> dict[str, Any]:
    version_id = latest_version.get("tool_version_id") if latest_version else None
    source_kind = str(tool.get("source_kind") or "custom")
    return {
        "tool_ref": f"{source_kind}:{version_id}" if isinstance(version_id, str) and version_id else None,
        "tool_id": tool["tool_id"],
        "tool_name": tool["tool_name"],
        "display_name": tool.get("display_name") or tool["tool_name"],
        "description": tool.get("description") or "",
        "source_kind": source_kind,
        "scope_kind": "project",
        "read_only": False,
        "approval_mode": tool.get("approval_mode") or "manual",
        "latest_version": latest_version,
        "updated_at": tool.get("updated_at"),
    }


def _builtin_list_item(tool: dict[str, Any]) -> dict[str, Any]:
    return {
        "tool_ref": tool["tool_ref"],
        "tool_id": None,
        "tool_name": tool["tool_name"],
        "display_name": tool["display_name"],
        "description": tool.get("description") or "",
        "source_kind": "builtin",
        "scope_kind": "system",
        "read_only": True,
        "approval_mode": tool.get("approval_mode") or "auto",
        "latest_version": None,
        "updated_at": None,
    }


def list_tools(
    *,
    user_id: str,
    project_id: str,
    source_kind: str | None,
    include_archived: bool,
    cursor: str | None,
) -> dict[str, Any]:
    del cursor
    sb = get_supabase_admin()
    require_project_access(user_id=user_id, project_id=project_id, sb=sb)

    items: list[dict[str, Any]] = []
    if source_kind in (None, "builtin"):
        items.extend(_builtin_list_item(tool) for tool in list_builtin_tools())

    project_tools = _load_project_tool_rows(sb=sb, project_id=project_id)
    if not include_archived:
        project_tools = [row for row in project_tools if row.get("archived_at") is None]
    if source_kind is not None:
        project_tools = [row for row in project_tools if row.get("source_kind", "custom") == source_kind]

    versions_by_tool: dict[str, list[dict[str, Any]]] = {}
    for version in _load_tool_versions(sb=sb):
        tool_id = version.get("tool_id")
        if isinstance(tool_id, str):
            versions_by_tool.setdefault(tool_id, []).append(version)

    items.extend(
        _project_tool_list_item(tool, _select_latest_version(tool, versions_by_tool))
        for tool in project_tools
    )

    return {"items": items, "next_cursor": None}


def get_tools_bootstrap(*, user_id: str, project_id: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_project_access(user_id=user_id, project_id=project_id, sb=sb)
    sandbox_profiles = (
        sb.table("agchain_sandbox_profiles")
        .select("*")
        .eq("project_id", project_id)
        .order("updated_at", desc=True)
        .execute()
        .data
        or []
    )
    return {
        "builtin_catalog": [_builtin_list_item(tool) for tool in list_builtin_tools()],
        "sandbox_profiles": sandbox_profiles,
        "source_kind_options": ["custom", "bridged", "mcp_server"],
        "secret_slot_contract": {
            "value_kinds": ["secret", "token", "api_key", "client_secret", "webhook_secret"],
        },
    }


def get_tool_detail(*, user_id: str, project_id: str, tool_id: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_project_access(user_id=user_id, project_id=project_id, sb=sb)

    tool = _load_tool_row(sb=sb, project_id=project_id, tool_id=tool_id)
    versions = [_version_detail_item(tool, version) for version in _load_versions_for_tool(sb=sb, tool_id=tool_id)]
    latest_version = _select_latest_version(tool, {tool_id: versions})
    tool_payload = _project_tool_list_item(tool, latest_version)
    return {
        "tool": {
            "tool_id": tool_payload["tool_id"],
            "tool_ref": tool_payload["tool_ref"],
            "tool_name": tool_payload["tool_name"],
            "display_name": tool_payload["display_name"],
            "description": tool_payload["description"],
            "source_kind": tool_payload["source_kind"],
            "approval_mode": tool_payload["approval_mode"],
        },
        "latest_version": latest_version,
        "versions": versions,
    }


def _version_detail_item(tool: dict[str, Any], version: dict[str, Any]) -> dict[str, Any]:
    if str(tool.get("source_kind") or "") != "mcp_server":
        return version
    config = dict(version.get("tool_config_jsonb") or {})
    discovery = dict(config.get("discovery_metadata") or {})
    if not discovery:
        return version
    return {
        **version,
        "discovered_tools": discovery.get("discovered_tools") or [],
        "last_discovery_validated_at": discovery.get("validated_at"),
    }


def create_tool(*, user_id: str, project_id: str, tool: dict[str, Any], initial_version: dict[str, Any]) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_project_write_access(user_id=user_id, project_id=project_id, sb=sb)

    now = _utc_now_iso()
    tool_row = (
        sb.table("agchain_tools")
        .insert(
            {
                "project_id": project_id,
                "tool_name": tool["tool_name"],
                "display_name": tool.get("display_name") or tool["tool_name"],
                "description": tool.get("description") or "",
                "source_kind": tool.get("source_kind") or "custom",
                "approval_mode": tool.get("approval_mode") or "manual",
                "sandbox_requirement_jsonb": tool.get("sandbox_requirement_jsonb") or {},
                "updated_at": now,
            }
        )
        .execute()
        .data[0]
    )
    version_row = (
        sb.table("agchain_tool_versions")
        .insert(
            {
                "tool_id": tool_row["tool_id"],
                "version_label": initial_version["version_label"],
                "input_schema_jsonb": initial_version.get("input_schema_jsonb") or {},
                "output_schema_jsonb": initial_version.get("output_schema_jsonb") or {},
                "tool_config_jsonb": initial_version.get("tool_config_jsonb") or {},
                "parallel_calls_allowed": initial_version.get("parallel_calls_allowed", False),
                "status": initial_version.get("status") or "draft",
            }
        )
        .execute()
        .data[0]
    )
    sb.table("agchain_tools").update({"latest_version_id": version_row["tool_version_id"], "updated_at": now}).eq(
        "tool_id", tool_row["tool_id"]
    ).execute()
    tool_row = {**tool_row, "latest_version_id": version_row["tool_version_id"], "updated_at": now}
    return {
        "tool": _project_tool_list_item(tool_row, version_row),
        "latest_version": version_row,
        "versions": [version_row],
    }


def update_tool(*, user_id: str, project_id: str, tool_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_project_write_access(user_id=user_id, project_id=project_id, sb=sb)
    tool = _load_tool_row(sb=sb, project_id=project_id, tool_id=tool_id)
    payload = {**updates, "updated_at": _utc_now_iso()}
    sb.table("agchain_tools").update(payload).eq("tool_id", tool_id).execute()
    return {"tool": {**tool, **payload}}


def create_tool_version(*, user_id: str, project_id: str, tool_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_project_write_access(user_id=user_id, project_id=project_id, sb=sb)
    _load_tool_row(sb=sb, project_id=project_id, tool_id=tool_id)
    version = (
        sb.table("agchain_tool_versions")
        .insert(
            {
                "tool_id": tool_id,
                "version_label": payload["version_label"],
                "input_schema_jsonb": payload.get("input_schema_jsonb") or {},
                "output_schema_jsonb": payload.get("output_schema_jsonb") or {},
                "tool_config_jsonb": payload.get("tool_config_jsonb") or {},
                "parallel_calls_allowed": payload.get("parallel_calls_allowed", False),
                "status": payload.get("status") or "draft",
            }
        )
        .execute()
        .data[0]
    )
    return {"tool_version": version}


def update_tool_version(*, user_id: str, project_id: str, tool_id: str, tool_version_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_project_write_access(user_id=user_id, project_id=project_id, sb=sb)
    version = _load_tool_version_row(sb=sb, tool_id=tool_id, tool_version_id=tool_version_id)
    sb.table("agchain_tool_versions").update(updates).eq("tool_version_id", tool_version_id).execute()
    return {"tool_version": {**version, **updates}}


def publish_tool_version(*, user_id: str, project_id: str, tool_id: str, tool_version_id: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_project_write_access(
        user_id=user_id,
        project_id=project_id,
        allowed_project_roles=("project_admin",),
        sb=sb,
    )
    tool = _load_tool_row(sb=sb, project_id=project_id, tool_id=tool_id)
    version = _load_tool_version_row(sb=sb, tool_id=tool_id, tool_version_id=tool_version_id)
    preview_payload = preview_tool_definition(
        user_id=user_id,
        project_id=project_id,
        source_kind=str(tool.get("source_kind") or "custom"),
        draft={
            "tool_version_id": tool_version_id,
            "version_label": version.get("version_label"),
            "parallel_calls_allowed": version.get("parallel_calls_allowed", False),
            "tool_config_jsonb": version.get("tool_config_jsonb") or {},
        },
        sb=sb,
        enforce_project_write_access=False,
    )
    if not preview_payload["validation"]["ok"]:
        raise HTTPException(status_code=400, detail="Tool version failed preview validation")
    if str(tool.get("source_kind") or "") == "mcp_server" and not preview_payload["discovered_tools"]:
        raise HTTPException(status_code=400, detail="MCP server publish requires at least one child tool")

    now = _utc_now_iso()
    version_updates: dict[str, Any] = {"status": "published"}
    if preview_payload["discovered_tools"]:
        tool_config_jsonb = dict(version.get("tool_config_jsonb") or {})
        tool_config_jsonb["discovery_metadata"] = {
            "validated_at": now,
            "discovered_tools": preview_payload["discovered_tools"],
        }
        version_updates["tool_config_jsonb"] = tool_config_jsonb
    sb.table("agchain_tool_versions").update(version_updates).eq("tool_version_id", tool_version_id).execute()
    sb.table("agchain_tools").update({"latest_version_id": tool_version_id, "updated_at": now}).eq("tool_id", tool_id).execute()
    tool_payload = {**tool, "latest_version_id": tool_version_id, "updated_at": now}
    version_payload = _version_detail_item(tool, {**version, **version_updates})
    return {"tool": _project_tool_list_item(tool_payload, version_payload), "tool_version": version_payload}


def archive_tool(*, user_id: str, project_id: str, tool_id: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_project_write_access(
        user_id=user_id,
        project_id=project_id,
        allowed_project_roles=("project_admin",),
        sb=sb,
    )
    tool = _load_tool_row(sb=sb, project_id=project_id, tool_id=tool_id)
    now = _utc_now_iso()
    sb.table("agchain_tools").update({"archived_at": now, "updated_at": now}).eq("tool_id", tool_id).execute()
    return {"tool": {**tool, "archived_at": now, "updated_at": now}}
