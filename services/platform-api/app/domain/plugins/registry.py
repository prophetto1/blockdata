"""Plugin registry — auto-discovers and maps task_type -> handler."""

import importlib
import inspect
import logging
import pkgutil
from typing import Any

from app.domain.plugins.models import BasePlugin

logger = logging.getLogger("platform-api")

PLUGIN_REGISTRY: dict[str, BasePlugin] = {}
FUNCTION_NAME_MAP: dict[str, str] = {}


def _task_type_to_function_name(task_type: str) -> str:
    if task_type.startswith("blockdata."):
        parts = task_type.split(".")
        return "_".join(parts[1:])

    if task_type.startswith("io.kestra.plugin."):
        parts = task_type.replace("io.kestra.plugin.", "").split(".")
        parts[-1] = parts[-1].lower()
        if len(parts) == 3 and parts[0] == "core" and parts[1] == "flow":
            parts = [parts[0], parts[2]]
        elif len(parts) >= 2 and parts[-1] == parts[-2]:
            parts.pop()
        return "_".join(parts)

    return ""


def discover_plugins() -> None:
    """Scan app/plugins/ for all BasePlugin subclasses and register them."""
    import app.plugins as plugins_pkg

    for _importer, modname, _ispkg in pkgutil.iter_modules(plugins_pkg.__path__):
        try:
            module = importlib.import_module(f"app.plugins.{modname}")
        except Exception as exc:
            logger.warning("Skipping plugin %s: %s", modname, exc)
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
                "parameter_schema": plugin.parameter_schema(),
            }
    return list(seen.values())
