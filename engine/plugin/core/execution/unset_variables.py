from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\execution\UnsetVariables.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.execution_updatable_task import ExecutionUpdatableTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class UnsetVariables(Task):
    """Remove execution variables."""
    variables: Property[list[str]]
    ignore_missing: Property[bool]

    def update(self, execution: Execution, run_context: RunContext) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def remove_var(self, vars: dict[str, Any], key: str, ignore_missing: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java
