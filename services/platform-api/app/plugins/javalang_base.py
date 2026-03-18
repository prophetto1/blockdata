"""Shared helpers for javalang plugin functions."""

from __future__ import annotations

from typing import Any

from javalang.ast import Node


def _require_string(params: dict[str, Any], key: str) -> str:
    value = params.get(key, "")
    if not isinstance(value, str) or not value:
        raise ValueError(f"{key} is required")
    return value


def _serialize_token(token: Any) -> dict[str, Any]:
    return {
        "type": token.__class__.__name__,
        "value": token.value,
        "position": list(token.position) if token.position else None,
        "javadoc": getattr(token, "javadoc", None),
    }


def _serialize_ast(value: Any) -> Any:
    if isinstance(value, Node):
        data: dict[str, Any] = {"node_type": value.__class__.__name__}
        for attr in value.attrs:
            data[attr] = _serialize_ast(getattr(value, attr))
        return data
    if isinstance(value, list):
        return [_serialize_ast(item) for item in value]
    if isinstance(value, tuple):
        return [_serialize_ast(item) for item in value]
    if isinstance(value, set):
        return [_serialize_ast(item) for item in sorted(value, key=repr)]
    if hasattr(value, "_fields"):
        return {field: _serialize_ast(getattr(value, field)) for field in value._fields}
    return value
