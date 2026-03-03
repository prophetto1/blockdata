"""Plugin registry — auto-discovers and maps task_type → handler."""

import importlib
import inspect
import pkgutil
from typing import Any

from .shared.base import BasePlugin

PLUGIN_REGISTRY: dict[str, BasePlugin] = {}
FUNCTION_NAME_MAP: dict[str, str] = {}  # function_name → primary task_type


def _task_type_to_function_name(task_type: str) -> str:
    """Derive a function_name from a task_type.

    Rules (matches registry_service_functions.function_name convention):
      blockdata.eyecite.clean → eyecite_clean
      blockdata.eyecite.reporters → eyecite_reporters
      io.kestra.plugin.core.log.Log → core_log
      io.kestra.plugin.core.flow.Sleep → core_sleep
      io.kestra.plugin.core.http.Request → core_http_request
      io.kestra.plugin.scripts.python.Script → scripts_python_script
      io.kestra.core.tasks.* → (legacy alias, skip)
    """
    if task_type.startswith("blockdata."):
        # blockdata.<provider>.<function> → <provider>_<function>
        parts = task_type.split(".")
        return "_".join(parts[1:])

    if task_type.startswith("io.kestra.plugin."):
        # io.kestra.plugin.core.log.Log → core_log
        parts = task_type.replace("io.kestra.plugin.", "").split(".")
        parts[-1] = parts[-1].lower()
        # Drop "flow" subpackage — it's just organizational (core.flow.Sleep → core_sleep)
        if len(parts) == 3 and parts[0] == "core" and parts[1] == "flow":
            parts = [parts[0], parts[2]]
        # Deduplicate when subpackage == class name (core.log.Log → core_log)
        elif len(parts) >= 2 and parts[-1] == parts[-2]:
            parts.pop()
        return "_".join(parts)

    return ""


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

                # Register primary task_type under its function_name
                if instance.task_types:
                    primary = instance.task_types[0]
                    fn = _task_type_to_function_name(primary)
                    if fn:
                        FUNCTION_NAME_MAP[fn] = primary


def resolve(task_type: str) -> BasePlugin | None:
    """Look up a plugin handler by task type string."""
    return PLUGIN_REGISTRY.get(task_type)


def resolve_by_function_name(function_name: str) -> str | None:
    """Look up a task_type by function_name (for named URL routes)."""
    return FUNCTION_NAME_MAP.get(function_name)


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
