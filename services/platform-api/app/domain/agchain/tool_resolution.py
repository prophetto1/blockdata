from __future__ import annotations

import asyncio
import threading
from contextlib import AsyncExitStack
from typing import Any

from fastapi import HTTPException
from opentelemetry import trace

from app.domain.agchain.project_access import require_project_write_access
from app.infra.supabase_client import get_supabase_admin
from app.observability.contract import safe_attributes

from .tool_catalog import list_builtin_tools

tracer = trace.get_tracer(__name__)

_ALLOWED_SOURCE_KINDS = {"custom", "bridged", "mcp_server"}
_ALLOWED_IMPLEMENTATION_KINDS = {"python_callable", "package_entrypoint", "external_ref"}
_ALLOWED_TRANSPORT_TYPES = {"stdio", "http", "sse"}
_ALLOWED_SECRET_VALUE_KINDS = {"secret", "token", "api_key", "client_secret", "webhook_secret"}


def preview_tool_definition(
    *,
    user_id: str,
    project_id: str,
    source_kind: str,
    draft: dict[str, Any],
    sb=None,
    enforce_project_write_access: bool = True,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    if enforce_project_write_access:
        require_project_write_access(user_id=user_id, project_id=project_id, sb=admin)

    with tracer.start_as_current_span("agchain.tools.preview.normalize") as span:
        normalized_definition, errors = _normalize_definition(source_kind=source_kind, draft=draft)
        set_attrs = {
            "project_id_present": True,
            "source_kind": source_kind,
            "has_secret_refs": bool(_collect_secret_slots(normalized_definition.get("tool_config_jsonb") or {})),
            "result": "ok" if not errors else "invalid",
        }
        for key, value in safe_attributes(set_attrs).items():
            if value is not None:
                span.set_attribute(key, value)

    missing_secret_slots = _compute_missing_secret_slots(
        sb=admin,
        user_id=user_id,
        config=normalized_definition.get("tool_config_jsonb") or {},
    )

    discovered_tools: list[dict[str, Any]] = []
    warnings: list[str] = []
    if source_kind == "mcp_server" and not errors:
        with tracer.start_as_current_span("agchain.tools.preview.discover") as span:
            try:
                discovered_tools = _attach_preview_tool_refs(
                    tool_version_id=_coerce_optional_string(draft.get("tool_version_id")),
                    tools=discover_mcp_server_tools(normalized_definition["tool_config_jsonb"]),
                )
                result = "ok"
            except HTTPException as exc:
                errors.append(str(exc.detail))
                result = "error"
            for key, value in safe_attributes(
                {
                    "project_id_present": True,
                    "source_kind": source_kind,
                    "discovered_count": len(discovered_tools),
                    "result": result,
                }
            ).items():
                if value is not None:
                    span.set_attribute(key, value)

    return {
        "normalized_definition": normalized_definition,
        "discovered_tools": discovered_tools,
        "validation": {
            "ok": not errors,
            "errors": errors,
            "warnings": warnings,
        },
        "missing_secret_slots": missing_secret_slots,
    }


def discover_mcp_server_tools(tool_config_jsonb: dict[str, Any]) -> list[dict[str, Any]]:
    try:
        return _run_async(_discover_mcp_server_tools_async(tool_config_jsonb))
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - exercised through integration usage
        raise HTTPException(status_code=400, detail=f"MCP discovery failed: {exc}") from exc


def normalize_pinned_tool_ref_binding(binding: dict[str, Any]) -> dict[str, Any]:
    tool_ref = _coerce_optional_string(binding.get("tool_ref"))
    if not tool_ref:
        raise HTTPException(status_code=422, detail="Pinned tool_ref is required")

    parsed = parse_tool_ref(tool_ref)
    if parsed is None:
        raise HTTPException(status_code=422, detail="Pinned tool_ref is invalid")

    normalized = {
        "position": binding.get("position"),
        "tool_ref": tool_ref,
        "source_kind": parsed["source_kind"],
        "tool_version_id": binding.get("tool_version_id") or parsed.get("tool_version_id"),
        "alias": binding.get("alias"),
        "config_overrides_jsonb": binding.get("config_overrides_jsonb") or {},
    }
    declared_tool_version_id = _coerce_optional_string(binding.get("tool_version_id"))
    parsed_tool_version_id = _coerce_optional_string(parsed.get("tool_version_id"))
    if declared_tool_version_id and declared_tool_version_id != parsed_tool_version_id:
        raise HTTPException(status_code=422, detail="tool_version_id must match the pinned tool_ref")
    if parsed["source_kind"] == "builtin":
        normalized["tool_version_id"] = None
    return normalized


def parse_tool_ref(tool_ref: str) -> dict[str, str | None] | None:
    if tool_ref.startswith("builtin:"):
        runtime_name = _coerce_optional_string(tool_ref.split(":", 1)[1])
        if not runtime_name:
            return None
        return {
            "source_kind": "builtin",
            "tool_version_id": None,
            "runtime_name": runtime_name,
            "server_tool_name": None,
        }

    prefix, _, remainder = tool_ref.partition(":")
    if prefix in {"custom", "bridged"}:
        tool_version_id = _coerce_optional_string(remainder)
        if not tool_version_id:
            return None
        return {
            "source_kind": prefix,
            "tool_version_id": tool_version_id,
            "runtime_name": None,
            "server_tool_name": None,
        }

    if prefix == "mcp":
        parts = tool_ref.split(":", 2)
        if len(parts) != 3:
            return None
        tool_version_id = _coerce_optional_string(parts[1])
        server_tool_name = _coerce_optional_string(parts[2])
        if not tool_version_id or not server_tool_name:
            return None
        return {
            "source_kind": "mcp_server",
            "tool_version_id": tool_version_id,
            "runtime_name": server_tool_name,
            "server_tool_name": server_tool_name,
        }
    return None


def compute_missing_secret_slots(*, sb, user_id: str, tool_config_jsonb: dict[str, Any]) -> list[dict[str, Any]]:
    return _compute_missing_secret_slots(sb=sb, user_id=user_id, config=tool_config_jsonb)


def resolve_tool_bindings(
    *,
    sb,
    user_id: str,
    project_id: str,
    bindings: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    builtin_by_ref = {row["tool_ref"]: row for row in list_builtin_tools()}
    tool_rows = (
        sb.table("agchain_tools")
        .select("*")
        .eq("project_id", project_id)
        .execute()
        .data
        or []
    )
    version_rows = sb.table("agchain_tool_versions").select("*").execute().data or []
    tools_by_id = {str(row["tool_id"]): row for row in tool_rows if row.get("tool_id")}
    versions_by_id = {str(row["tool_version_id"]): row for row in version_rows if row.get("tool_version_id")}

    resolved: list[dict[str, Any]] = []
    for index, raw_binding in enumerate(bindings, start=1):
        binding = normalize_pinned_tool_ref_binding({**raw_binding, "position": raw_binding.get("position") or index})
        parsed = parse_tool_ref(binding["tool_ref"])
        assert parsed is not None
        position = int(binding["position"] or index)

        if parsed["source_kind"] == "builtin":
            builtin = builtin_by_ref.get(binding["tool_ref"])
            if builtin:
                resolved.append(
                    {
                        "position": position,
                        "tool_ref": binding["tool_ref"],
                        "source_kind": "builtin",
                        "tool_version_id": None,
                        "alias": binding.get("alias"),
                        "display_name": builtin["display_name"],
                        "runtime_name": builtin["tool_name"],
                        "approval_mode": builtin.get("approval_mode") or "auto",
                        "parallel_calls_allowed": False,
                        "input_schema_jsonb": {},
                        "output_schema_jsonb": {},
                        "config_overrides_jsonb": binding.get("config_overrides_jsonb") or {},
                        "missing_secret_slots": [],
                        "resolution_status": "resolved",
                    }
                )
            else:
                resolved.append(_unresolved_binding_item(binding=binding, position=position, reason="missing_builtin"))
            continue

        version = versions_by_id.get(str(binding.get("tool_version_id") or ""))
        tool = tools_by_id.get(str(version.get("tool_id") or "")) if version else None
        if not version or not tool:
            resolved.append(_unresolved_binding_item(binding=binding, position=position, reason="missing_version"))
            continue

        tool_config_jsonb = dict(version.get("tool_config_jsonb") or {})
        missing_secret_slots = compute_missing_secret_slots(sb=sb, user_id=user_id, tool_config_jsonb=tool_config_jsonb)

        if parsed["source_kind"] == "mcp_server":
            discovery_metadata = dict(tool_config_jsonb.get("discovery_metadata") or {})
            discovered_tools = discovery_metadata.get("discovered_tools") or []
            child = next(
                (
                    row
                    for row in discovered_tools
                    if row.get("server_tool_name") == parsed.get("server_tool_name")
                ),
                None,
            )
            if not isinstance(child, dict):
                resolved.append(
                    _unresolved_binding_item(binding=binding, position=position, reason="missing_discovery")
                )
                continue
            resolved.append(
                {
                    "position": position,
                    "tool_ref": binding["tool_ref"],
                    "source_kind": "mcp_server",
                    "tool_version_id": binding.get("tool_version_id"),
                    "alias": binding.get("alias"),
                    "display_name": child.get("display_name") or parsed.get("server_tool_name"),
                    "runtime_name": parsed.get("server_tool_name"),
                    "approval_mode": tool.get("approval_mode") or "manual",
                    "parallel_calls_allowed": bool(version.get("parallel_calls_allowed", False)),
                    "input_schema_jsonb": child.get("input_schema_jsonb") or {},
                    "output_schema_jsonb": version.get("output_schema_jsonb") or {},
                    "config_overrides_jsonb": binding.get("config_overrides_jsonb") or {},
                    "missing_secret_slots": missing_secret_slots,
                    "resolution_status": "resolved",
                }
            )
            continue

        resolved.append(
            {
                "position": position,
                "tool_ref": binding["tool_ref"],
                "source_kind": str(parsed["source_kind"]),
                "tool_version_id": binding.get("tool_version_id"),
                "alias": binding.get("alias"),
                "display_name": tool.get("display_name") or tool.get("tool_name"),
                "runtime_name": tool.get("tool_name"),
                "approval_mode": tool.get("approval_mode") or "manual",
                "parallel_calls_allowed": bool(version.get("parallel_calls_allowed", False)),
                "input_schema_jsonb": version.get("input_schema_jsonb") or {},
                "output_schema_jsonb": version.get("output_schema_jsonb") or {},
                "config_overrides_jsonb": binding.get("config_overrides_jsonb") or {},
                "missing_secret_slots": missing_secret_slots,
                "resolution_status": "resolved",
            }
        )
    return resolved


async def _discover_mcp_server_tools_async(tool_config_jsonb: dict[str, Any]) -> list[dict[str, Any]]:
    try:
        from mcp.client.session import ClientSession
        from mcp.client.sse import sse_client
        from mcp.client.stdio import StdioServerParameters, stdio_client
        from mcp.client.streamable_http import streamablehttp_client
    except Exception as exc:  # pragma: no cover - depends on runtime environment
        raise HTTPException(status_code=400, detail="MCP discovery unavailable: missing MCP client dependency") from exc

    transport_type = str(tool_config_jsonb["transport_type"])

    if transport_type == "stdio":
        client_factory = lambda: stdio_client(
            StdioServerParameters(
                command=str(tool_config_jsonb["command"]),
                args=[str(arg) for arg in tool_config_jsonb.get("args") or []],
                cwd=tool_config_jsonb.get("cwd"),
            )
        )
    elif transport_type == "http":
        client_factory = lambda: streamablehttp_client(str(tool_config_jsonb["url"]), None, 5, 300)
    else:
        client_factory = lambda: sse_client(str(tool_config_jsonb["url"]), None, 5, 300)

    async with AsyncExitStack() as exit_stack:
        read, write, *_ = await exit_stack.enter_async_context(client_factory())
        session = await exit_stack.enter_async_context(ClientSession(read, write))
        await session.initialize()
        result = await session.list_tools()

    return [
        {
            "server_tool_name": tool.name,
            "display_name": tool.name,
            "description": tool.description or "",
            "input_schema_jsonb": tool.inputSchema or {},
        }
        for tool in result.tools
    ]


def _run_async(awaitable):
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(awaitable)

    result: dict[str, Any] = {}
    error: dict[str, BaseException] = {}

    def runner() -> None:
        try:
            result["value"] = asyncio.run(awaitable)
        except BaseException as exc:  # pragma: no cover - bridge helper
            error["value"] = exc

    thread = threading.Thread(target=runner, daemon=True)
    thread.start()
    thread.join()
    if "value" in error:
        raise error["value"]
    return result.get("value")


def _normalize_definition(*, source_kind: str, draft: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    errors: list[str] = []
    if source_kind not in _ALLOWED_SOURCE_KINDS:
        return {"source_kind": source_kind, "tool_config_jsonb": {}}, [f"Unsupported source_kind: {source_kind}"]

    config = dict(draft.get("tool_config_jsonb") or {})
    normalized: dict[str, Any] = {
        "source_kind": source_kind,
        "version_label": draft.get("version_label"),
        "parallel_calls_allowed": bool(draft.get("parallel_calls_allowed", False)),
        "tool_config_jsonb": {},
    }
    normalized_config = normalized["tool_config_jsonb"]
    normalized_config["secret_slots"] = _normalize_secret_slots(config.get("secret_slots"), errors, field_name="secret_slots")

    if "default_timeout_seconds" in config:
        if isinstance(config["default_timeout_seconds"], int):
            normalized_config["default_timeout_seconds"] = config["default_timeout_seconds"]
        else:
            errors.append("default_timeout_seconds must be an integer")
    if "notes" in config:
        if isinstance(config["notes"], str):
            normalized_config["notes"] = config["notes"]
        else:
            errors.append("notes must be a string")

    if source_kind == "custom":
        implementation_kind = _require_non_empty_string(config.get("implementation_kind"), "implementation_kind", errors)
        implementation_ref = _require_non_empty_string(config.get("implementation_ref"), "implementation_ref", errors)
        if implementation_kind and implementation_kind not in _ALLOWED_IMPLEMENTATION_KINDS:
            errors.append("implementation_kind must be one of python_callable, package_entrypoint, or external_ref")
        if implementation_kind:
            normalized_config["implementation_kind"] = implementation_kind
        if implementation_ref:
            normalized_config["implementation_ref"] = implementation_ref
    elif source_kind == "bridged":
        bridge_name = _require_non_empty_string(config.get("bridge_name"), "bridge_name", errors)
        implementation_ref = _require_non_empty_string(config.get("implementation_ref"), "implementation_ref", errors)
        if bridge_name:
            normalized_config["bridge_name"] = bridge_name
        if implementation_ref:
            normalized_config["implementation_ref"] = implementation_ref
    else:
        _normalize_mcp_server_config(config=config, normalized_config=normalized_config, errors=errors)

    return normalized, errors


def _normalize_mcp_server_config(*, config: dict[str, Any], normalized_config: dict[str, Any], errors: list[str]) -> None:
    transport_type = _require_non_empty_string(config.get("transport_type"), "transport_type", errors)
    if transport_type and transport_type not in _ALLOWED_TRANSPORT_TYPES:
        errors.append("transport_type must be one of stdio, http, or sse")
        return
    if transport_type:
        normalized_config["transport_type"] = transport_type

    for forbidden_key in ("headers", "authorization", "bearer_token", "env"):
        if forbidden_key in config:
            errors.append(f"{forbidden_key} is not allowed; use secret slot metadata instead")

    if transport_type == "stdio":
        command = _require_non_empty_string(config.get("command"), "command", errors)
        if command:
            normalized_config["command"] = command
        args = config.get("args") or []
        if not isinstance(args, list) or any(not isinstance(item, str) for item in args):
            errors.append("args must be an array of strings")
        else:
            normalized_config["args"] = args
        cwd = config.get("cwd")
        if cwd is not None and not isinstance(cwd, str):
            errors.append("cwd must be a string")
        elif isinstance(cwd, str) and cwd:
            normalized_config["cwd"] = cwd
        normalized_config["env_secret_slots"] = _normalize_secret_slots(
            config.get("env_secret_slots"),
            errors,
            field_name="env_secret_slots",
        )
    elif transport_type in {"http", "sse"}:
        url = _require_non_empty_string(config.get("url"), "url", errors)
        if url:
            normalized_config["url"] = url
        normalized_config["headers_secret_slots"] = _normalize_secret_slots(
            config.get("headers_secret_slots"),
            errors,
            field_name="headers_secret_slots",
        )


def _normalize_secret_slots(value: Any, errors: list[str], *, field_name: str) -> list[dict[str, Any]]:
    if value in (None, []):
        return []
    if not isinstance(value, list):
        errors.append(f"{field_name} must be an array")
        return []

    normalized: list[dict[str, Any]] = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            errors.append(f"{field_name}[{index}] must be an object")
            continue
        slot_key = _coerce_optional_string(item.get("slot_key"))
        if not slot_key:
            errors.append(f"{field_name}[{index}].slot_key is required")
            continue
        value_kind = _coerce_optional_string(item.get("value_kind")) or "secret"
        if value_kind not in _ALLOWED_SECRET_VALUE_KINDS:
            errors.append(f"{field_name}[{index}].value_kind is invalid")
            continue
        normalized_slot = {
            "slot_key": slot_key,
            "value_kind": value_kind,
            "required": bool(item.get("required", False)),
            "description": _coerce_optional_string(item.get("description")) or "",
        }
        default_hint = _coerce_optional_string(item.get("default_secret_name_hint"))
        if default_hint:
            normalized_slot["default_secret_name_hint"] = default_hint
        for passthrough_key in ("header_name", "env_var_name"):
            passthrough_value = _coerce_optional_string(item.get(passthrough_key))
            if passthrough_value:
                normalized_slot[passthrough_key] = passthrough_value
        normalized.append(normalized_slot)
    return normalized


def _compute_missing_secret_slots(*, sb, user_id: str, config: dict[str, Any]) -> list[dict[str, Any]]:
    names = _load_user_secret_names(sb=sb, user_id=user_id)
    missing: list[dict[str, Any]] = []
    for slot in _collect_secret_slots(config):
        if not slot.get("required"):
            continue
        expected_name = str(slot.get("default_secret_name_hint") or slot["slot_key"]).upper()
        if expected_name in names:
            continue
        missing.append(
            {
                "slot_key": slot["slot_key"],
                "value_kind": slot.get("value_kind") or "secret",
                "default_secret_name_hint": slot.get("default_secret_name_hint"),
            }
        )
    return missing


def _collect_secret_slots(config: dict[str, Any]) -> list[dict[str, Any]]:
    slots: list[dict[str, Any]] = []
    for key in ("secret_slots", "env_secret_slots", "headers_secret_slots"):
        values = config.get(key) or []
        if isinstance(values, list):
            slots.extend(item for item in values if isinstance(item, dict))
    return slots


def _load_user_secret_names(*, sb, user_id: str) -> set[str]:
    rows = (
        sb.table("user_variables")
        .select("name")
        .eq("user_id", user_id)
        .execute()
        .data
        or []
    )
    return {str(row.get("name") or "").upper() for row in rows if row.get("name")}


def _attach_preview_tool_refs(*, tool_version_id: str | None, tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    attached: list[dict[str, Any]] = []
    for tool in tools:
        server_tool_name = str(tool["server_tool_name"])
        preview_tool_ref = (
            f"mcp:{tool_version_id}:{server_tool_name}" if tool_version_id else server_tool_name
        )
        attached.append({**tool, "preview_tool_ref": preview_tool_ref})
    return attached


def _unresolved_binding_item(*, binding: dict[str, Any], position: int, reason: str) -> dict[str, Any]:
    parsed = parse_tool_ref(binding["tool_ref"]) or {}
    return {
        "position": position,
        "tool_ref": binding["tool_ref"],
        "source_kind": binding.get("source_kind") or parsed.get("source_kind"),
        "tool_version_id": binding.get("tool_version_id"),
        "alias": binding.get("alias"),
        "display_name": parsed.get("runtime_name") or binding["tool_ref"],
        "runtime_name": parsed.get("runtime_name"),
        "approval_mode": "manual",
        "parallel_calls_allowed": False,
        "input_schema_jsonb": {},
        "output_schema_jsonb": {},
        "config_overrides_jsonb": binding.get("config_overrides_jsonb") or {},
        "missing_secret_slots": [],
        "resolution_status": reason,
    }


def _require_non_empty_string(value: Any, field_name: str, errors: list[str]) -> str | None:
    text = _coerce_optional_string(value)
    if not text:
        errors.append(f"{field_name} is required")
        return None
    return text


def _coerce_optional_string(value: Any) -> str | None:
    if isinstance(value, str):
        text = value.strip()
        return text if text else None
    return None
