"""Traced from Kestra's plugin discovery chain:

  io.kestra.core.plugins.PluginRegistry    → PLUGIN_REGISTRY dict
  io.kestra.core.plugins.PluginScanner     → discover_plugins()
  io.kestra.core.plugins.PluginClassLoader → importlib

Kestra scans the classpath for @Plugin-annotated classes.
BD scans app/plugins/ for BasePlugin subclasses.
Same purpose: map task_type string → plugin instance.

Also traced from BD's existing registry.py:
  _task_type_to_function_name()  → maps Kestra task types to REST endpoint names
  resolve()                      → lookup plugin by task_type
  resolve_by_function_name()     → lookup by REST function name
"""
from __future__ import annotations

import importlib
import inspect
import pkgutil
from typing import Any

from .models import BasePlugin

PLUGIN_REGISTRY: dict[str, BasePlugin] = {}
FUNCTION_NAME_MAP: dict[str, str] = {}


def _task_type_to_function_name(task_type: str) -> str:
    """Convert task_type to a REST-friendly function name.

    io.kestra.plugin.mongodb.Find      → mongodb_find
    io.kestra.plugin.mongodb.InsertOne  → mongodb_insertone
    io.kestra.plugin.mongodb.Aggregate  → mongodb_aggregate
    blockdata.mongodb.find              → mongodb_find
    """
    if task_type.startswith("blockdata."):
        parts = task_type.split(".")
        return "_".join(parts[1:])

    if task_type.startswith("io.kestra.plugin."):
        parts = task_type.replace("io.kestra.plugin.", "").split(".")
        parts[-1] = parts[-1].lower()
        if len(parts) >= 2 and parts[-1] == parts[-2]:
            parts.pop()
        return "_".join(parts)

    return task_type.replace(".", "_").lower()


def discover_plugins() -> None:
    """Scan this package for all BasePlugin subclasses and register them."""
    import tr as this_pkg

    for _importer, modname, _ispkg in pkgutil.iter_modules(this_pkg.__path__):
        try:
            module = importlib.import_module(f"tr.{modname}")
        except Exception:
            continue
        for _name, obj in inspect.getmembers(module, inspect.isclass):
            if issubclass(obj, BasePlugin) and obj is not BasePlugin:
                instance = obj()
                for task_type in instance.task_types:
                    PLUGIN_REGISTRY[task_type] = instance
                if instance.task_types:
                    primary = instance.task_types[0]
                    fn = _task_type_to_function_name(primary)
                    if fn:
                        FUNCTION_NAME_MAP[fn] = primary


def resolve(task_type: str) -> BasePlugin | None:
    return PLUGIN_REGISTRY.get(task_type)


def resolve_by_function_name(function_name: str) -> str | None:
    return FUNCTION_NAME_MAP.get(function_name)


def list_all() -> list[dict[str, Any]]:
    seen: dict[int, dict] = {}
    for task_type, plugin in PLUGIN_REGISTRY.items():
        pid = id(plugin)
        if pid not in seen:
            seen[pid] = {
                "class": plugin.__class__.__name__,
                "task_types": list(plugin.task_types),
            }
    return list(seen.values())
