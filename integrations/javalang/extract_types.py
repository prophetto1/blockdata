"""Extract type declarations from Java source."""

from __future__ import annotations

from typing import Any

import javalang

from integrations.javalang.service import parse_tree


def _extract_modifiers(node) -> list[str]:
    if node.modifiers:
        return sorted(node.modifiers)
    return []


def _extract_base_types(node) -> dict[str, Any]:
    result: dict[str, Any] = {}
    if hasattr(node, "extends") and node.extends:
        if isinstance(node.extends, list):
            result["extends"] = [e.name for e in node.extends]
        else:
            result["extends"] = [node.extends.name]
    if hasattr(node, "implements") and node.implements:
        result["implements"] = [i.name for i in node.implements]
    return result


def extract_types(code: str) -> dict:
    """Parse Java source and return all type declarations.

    Returns:
        {
            "classes": [{"name": "Flow", "modifiers": ["public"], "extends": ["AbstractFlow"], ...}],
            "interfaces": [{"name": "TaskInterface", ...}],
            "enums": [{"name": "State", "constants": ["CREATED", "RUNNING", ...]}],
            "count": 5,
        }
    """
    tree = parse_tree(code)

    classes = []
    interfaces = []
    enums = []

    for _, node in tree.filter(javalang.tree.ClassDeclaration):
        info: dict[str, Any] = {
            "name": node.name,
            "modifiers": _extract_modifiers(node),
        }
        info.update(_extract_base_types(node))
        fields = []
        for field in node.fields:
            for decl in field.declarators:
                fields.append(decl.name)
        if fields:
            info["fields"] = fields
        methods = [m.name for m in node.methods]
        if methods:
            info["methods"] = methods
        classes.append(info)

    for _, node in tree.filter(javalang.tree.InterfaceDeclaration):
        info = {
            "name": node.name,
            "modifiers": _extract_modifiers(node),
        }
        info.update(_extract_base_types(node))
        methods = [m.name for m in node.methods]
        if methods:
            info["methods"] = methods
        interfaces.append(info)

    for _, node in tree.filter(javalang.tree.EnumDeclaration):
        info = {
            "name": node.name,
            "modifiers": _extract_modifiers(node),
        }
        if node.body and node.body.constants:
            info["constants"] = [c.name for c in node.body.constants]
        enums.append(info)

    return {
        "classes": classes,
        "interfaces": interfaces,
        "enums": enums,
        "count": len(classes) + len(interfaces) + len(enums),
    }
