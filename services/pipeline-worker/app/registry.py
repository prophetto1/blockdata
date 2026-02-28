"""Plugin registry — auto-discovers and maps task_type → handler."""

import importlib
import inspect
import pkgutil
from typing import Any

from .shared.base import BasePlugin

PLUGIN_REGISTRY: dict[str, BasePlugin] = {}


def discover_plugins() -> None:
    """Scan app/plugins/ for all BasePlugin subclasses and register them."""
    import app.plugins as plugins_pkg

    for _importer, modname, _ispkg in pkgutil.iter_modules(plugins_pkg.__path__):
        module = importlib.import_module(f"app.plugins.{modname}")
        for _name, obj in inspect.getmembers(module, inspect.isclass):
            if issubclass(obj, BasePlugin) and obj is not BasePlugin:
                instance = obj()
                for task_type in instance.task_types:
                    PLUGIN_REGISTRY[task_type] = instance


def resolve(task_type: str) -> BasePlugin | None:
    """Look up a plugin handler by Kestra task type string."""
    return PLUGIN_REGISTRY.get(task_type)


def list_all() -> list[dict[str, Any]]:
    """Return all registered plugins with their task_types and parameter schemas."""
    seen: dict[int, dict] = {}
    for task_type, plugin in PLUGIN_REGISTRY.items():
        pid = id(plugin)
        if pid not in seen:
            seen[pid] = {
                "class": plugin.__class__.__name__,
                "task_types": list(plugin.task_types),
                "parameter_schema": plugin.parameter_schema(),
            }
    return list(seen.values())
