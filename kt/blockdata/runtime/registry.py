from __future__ import annotations

from typing import Any

from blockdata.connectors.mongodb.aggregate import Aggregate
from blockdata.connectors.mongodb.bulk import Bulk
from blockdata.connectors.mongodb.delete import Delete
from blockdata.connectors.mongodb.find import Find
from blockdata.connectors.mongodb.insert_one import InsertOne
from blockdata.connectors.mongodb.load import Load
from blockdata.connectors.mongodb.trigger import Trigger
from blockdata.connectors.mongodb.update import Update

TASK_CLASS_REGISTRY: dict[str, type] = {}
FUNCTION_NAME_MAP: dict[str, str] = {}

_TASK_TYPES: dict[type, list[str]] = {
    Aggregate: ["blockdata.mongodb.aggregate"],
    Bulk: ["blockdata.mongodb.bulk"],
    Delete: ["blockdata.mongodb.delete"],
    Find: ["blockdata.mongodb.find"],
    InsertOne: ["blockdata.mongodb.insert_one"],
    Load: ["blockdata.mongodb.load"],
    Trigger: ["blockdata.mongodb.trigger"],
    Update: ["blockdata.mongodb.update"],
}


def _task_type_to_function_name(task_type: str) -> str:
    if task_type.startswith("blockdata."):
        parts = task_type.split(".")
        return "_".join(parts[1:])

    return task_type.replace(".", "_").lower()


def register_all() -> None:
    if TASK_CLASS_REGISTRY:
        return

    for plugin_class, task_types in _TASK_TYPES.items():
        for task_type in task_types:
            TASK_CLASS_REGISTRY[task_type] = plugin_class
        primary_task_type = task_types[0]
        primary_function_name = _task_type_to_function_name(primary_task_type)
        FUNCTION_NAME_MAP[primary_function_name] = primary_task_type

        if primary_function_name == "mongodb_insert_one":
            FUNCTION_NAME_MAP["mongodb_insertone"] = primary_task_type


def resolve(task_type: str) -> type | None:
    register_all()
    return TASK_CLASS_REGISTRY.get(task_type)


def resolve_by_function_name(function_name: str) -> str | None:
    register_all()
    return FUNCTION_NAME_MAP.get(function_name)


def list_all() -> list[dict[str, Any]]:
    register_all()
    rows: list[dict[str, Any]] = []
    for plugin_class, task_types in _TASK_TYPES.items():
        rows.append(
            {
                "class": plugin_class.__name__,
                "task_types": task_types,
                "function_name": _task_type_to_function_name(task_types[0]),
            }
        )
    return rows
