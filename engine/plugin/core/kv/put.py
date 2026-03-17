from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\kv\Put.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Put(Task):
    """Update an existing Key-Value entry"""
    key: Property[str]
    value: Property[Any]
    namespace: Property[str] = Property.ofExpression("{{ flow.namespace }}")
    error_on_missing: Property[bool] = Property.ofValue(false)

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def merge_values(self, existing_value: Any, new_value: Any) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def merge_entry_list_values(self, existing_value: Any, entries: list[Any]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def is_value_entry_list(self, entries: list[Any]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def validate_entry(self, entry: dict[Any, Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def to_string_key_map(self, map: dict[Any, Any], field_name: str) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
