"""Shared javalang service — thin wrappers around upstream javalang API."""

from __future__ import annotations

from typing import Any

import javalang
from javalang.ast import Node


# --- Serialization ---

def serialize_token(token: Any) -> dict[str, Any]:
    return {
        "type": token.__class__.__name__,
        "value": token.value,
        "position": list(token.position) if token.position else None,
        "javadoc": getattr(token, "javadoc", None),
    }


def serialize_ast(value: Any) -> Any:
    if isinstance(value, Node):
        data: dict[str, Any] = {"node_type": value.__class__.__name__}
        for attr in value.attrs:
            data[attr] = serialize_ast(getattr(value, attr))
        return data
    if isinstance(value, list):
        return [serialize_ast(item) for item in value]
    if isinstance(value, tuple):
        return [serialize_ast(item) for item in value]
    if isinstance(value, set):
        return [serialize_ast(item) for item in sorted(value, key=repr)]
    if hasattr(value, "_fields"):
        return {field: serialize_ast(getattr(value, field)) for field in value._fields}
    return value


# --- Native wrappers (8 upstream functions) ---

def tokenize(code: str, ignore_errors: bool = False) -> list[dict[str, Any]]:
    tokens = list(javalang.tokenizer.tokenize(code, ignore_errors=ignore_errors))
    return [serialize_token(t) for t in tokens]


def reformat_tokens(code: str, ignore_errors: bool = False) -> str:
    tokens = list(javalang.tokenizer.tokenize(code, ignore_errors=ignore_errors))
    return javalang.tokenizer.reformat_tokens(tokens)


def parse(code: str) -> dict[str, Any]:
    tree = javalang.parse.parse(code)
    return serialize_ast(tree)


def parse_expression(expression: str) -> dict[str, Any]:
    node = javalang.parse.parse_expression(expression)
    return serialize_ast(node)


def parse_member_signature(signature: str) -> dict[str, Any]:
    node = javalang.parse.parse_member_signature(signature)
    return serialize_ast(node)


def parse_constructor_signature(signature: str) -> dict[str, Any]:
    node = javalang.parse.parse_constructor_signature(signature)
    return serialize_ast(node)


def parse_type(type_source: str) -> dict[str, Any]:
    node = javalang.parse.parse_type(type_source)
    return serialize_ast(node)


def parse_type_signature(signature: str) -> dict[str, Any]:
    node = javalang.parse.parse_type_signature(signature)
    return serialize_ast(node)


# --- Raw tree access (for analysis tasks) ---

def parse_tree(code: str) -> javalang.tree.CompilationUnit:
    """Parse and return the raw javalang AST (not serialized)."""
    return javalang.parse.parse(code)
