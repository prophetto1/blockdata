"""Extract method and constructor signatures from Java source."""

from __future__ import annotations

from typing import Any

import javalang

from integrations.javalang.service import parse_tree


def _type_name(type_node) -> str:
    if type_node is None:
        return "void"
    if hasattr(type_node, "name"):
        name = type_node.name
        if hasattr(type_node, "arguments") and type_node.arguments:
            args = ", ".join(
                _type_name(a) for a in type_node.arguments if a is not None
            )
            return f"{name}<{args}>"
        return name
    return "?"


def _param_info(param) -> dict[str, str]:
    return {
        "name": param.name,
        "type": _type_name(param.type),
    }


def extract_signatures(code: str) -> dict:
    """Parse Java source and return method/constructor signatures.

    Returns:
        {
            "methods": [
                {
                    "name": "findById",
                    "return_type": "Optional<Task>",
                    "parameters": [{"name": "id", "type": "String"}],
                    "modifiers": ["public"],
                    "declaring_class": "Task",
                },
                ...
            ],
            "constructors": [...],
            "count": 15,
        }
    """
    tree = parse_tree(code)

    methods: list[dict[str, Any]] = []
    constructors: list[dict[str, Any]] = []

    for path, node in tree.filter(javalang.tree.MethodDeclaration):
        declaring_class = None
        for ancestor in reversed(path):
            if isinstance(ancestor, (javalang.tree.ClassDeclaration,
                                     javalang.tree.InterfaceDeclaration,
                                     javalang.tree.EnumDeclaration)):
                declaring_class = ancestor.name
                break

        info: dict[str, Any] = {
            "name": node.name,
            "return_type": _type_name(node.return_type),
            "parameters": [_param_info(p) for p in (node.parameters or [])],
        }
        if node.modifiers:
            info["modifiers"] = sorted(node.modifiers)
        if declaring_class:
            info["declaring_class"] = declaring_class
        methods.append(info)

    for path, node in tree.filter(javalang.tree.ConstructorDeclaration):
        declaring_class = None
        for ancestor in reversed(path):
            if isinstance(ancestor, javalang.tree.ClassDeclaration):
                declaring_class = ancestor.name
                break

        info = {
            "name": node.name,
            "parameters": [_param_info(p) for p in (node.parameters or [])],
        }
        if node.modifiers:
            info["modifiers"] = sorted(node.modifiers)
        if declaring_class:
            info["declaring_class"] = declaring_class
        constructors.append(info)

    return {
        "methods": methods,
        "constructors": constructors,
        "count": len(methods) + len(constructors),
    }
