from __future__ import annotations

import dataclasses
import re
import types
from dataclasses import dataclass, field, fields, is_dataclass
from enum import Enum
from pathlib import Path
from typing import Any, get_args, get_origin, get_type_hints

from blockdata.core.models.property import Property
from blockdata.core.runners.run_context import RunContext
from blockdata.connectors.mongodb.mongodb_connection import MongoDbConnection

from blockdata.runtime.registry import resolve, resolve_by_function_name

_EXPLICIT_ALIASES = {
    "from": "from_",
    "allowDiskUse": "allow_disk_use",
    "maxTimeMs": "max_time_ms",
    "batchSize": "batch_size",
    "idKey": "id_key",
    "removeIdKey": "remove_id_key",
    "connectionId": "connection_id",
}


@dataclass(slots=True)
class ExecutionRequest:
    params: dict[str, Any] = field(default_factory=dict)
    execution_id: str = ""
    task_run_id: str = ""
    user_id: str = ""
    variables: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ExecutionResult:
    function_name: str
    task_type: str
    output: Any


def execute_function(function_name: str, request: ExecutionRequest) -> ExecutionResult:
    task_type = resolve_by_function_name(function_name)
    if task_type is None:
        raise KeyError(f"No handler for function_name={function_name}")
    return execute_task(task_type, request, function_name=function_name)


def execute_task(task_type: str, request: ExecutionRequest, function_name: str | None = None) -> ExecutionResult:
    task_class = resolve(task_type)
    if task_class is None:
        raise KeyError(f"No handler for task_type={task_type}")

    task = build_task(task_class, request.params)
    context = RunContext(
        execution_id=request.execution_id or "exec",
        task_run_id=request.task_run_id,
        user_id=request.user_id,
        variables=request.variables,
    )

    if hasattr(task, "run"):
        output = task.run(context)
    elif hasattr(task, "evaluate"):
        output = task.evaluate(context)
    else:
        raise TypeError(f"Unsupported task class {task_class.__name__}")

    resolved_function_name = function_name or _task_type_to_function_name(task_type)
    return ExecutionResult(
        function_name=resolved_function_name,
        task_type=task_type,
        output=_serialize_output(output),
    )


def build_task(task_class: type, params: dict[str, Any]):
    normalized = _normalize_mapping(params)
    if "connection" not in normalized and ("connection_id" in normalized or "uri" in normalized):
        connection_value: dict[str, Any] = {}
        if "connection_id" in normalized:
            connection_value["connection_id"] = normalized.pop("connection_id")
        if "uri" in normalized:
            connection_value["uri"] = normalized.pop("uri")
        normalized["connection"] = connection_value

    return _build_dataclass_instance(task_class, normalized)


def _build_dataclass_instance(cls: type, values: dict[str, Any]):
    hints = get_type_hints(cls)
    kwargs: dict[str, Any] = {}
    for field_info in fields(cls):
        if field_info.name not in values:
            continue

        raw_value = values[field_info.name]
        annotation = hints.get(field_info.name, field_info.type)
        kwargs[field_info.name] = _coerce_value(raw_value, annotation)

    return cls(**kwargs)


def _coerce_value(value: Any, annotation: Any) -> Any:
    if value is None:
        return None

    if _annotation_contains(annotation, Property):
        return value if isinstance(value, Property) else Property.of_value(value)

    if _annotation_contains(annotation, MongoDbConnection):
        if isinstance(value, MongoDbConnection):
            return value
        if isinstance(value, dict):
            return _build_dataclass_instance(MongoDbConnection, _normalize_mapping(value))
        raise TypeError(f"Invalid MongoDbConnection value {value!r}")

    return value


def _annotation_contains(annotation: Any, target: type) -> bool:
    if annotation is target:
        return True

    origin = get_origin(annotation)
    if origin is None:
        return False

    if origin in (types.UnionType, getattr(__import__("typing"), "Union")):
        return any(_annotation_contains(arg, target) for arg in get_args(annotation))

    return origin is target


def _normalize_mapping(values: dict[str, Any]) -> dict[str, Any]:
    return {_normalize_key(key): value for key, value in values.items()}


def _normalize_key(key: str) -> str:
    if key in _EXPLICIT_ALIASES:
        return _EXPLICIT_ALIASES[key]
    return re.sub(r"(?<!^)(?=[A-Z])", "_", key).lower()


def _task_type_to_function_name(task_type: str) -> str:
    if task_type.startswith("blockdata."):
        parts = task_type.split(".")
        return "_".join(parts[1:])

    return task_type.replace(".", "_").lower()


def _serialize_output(value: Any) -> Any:
    if is_dataclass(value):
        return {key: _serialize_output(item) for key, item in dataclasses.asdict(value).items()}
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {key: _serialize_output(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialize_output(item) for item in value]
    if isinstance(value, tuple):
        return [_serialize_output(item) for item in value]
    if isinstance(value, Path):
        return str(value)
    return value
