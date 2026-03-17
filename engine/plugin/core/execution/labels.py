from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\execution\Labels.java
# WARNING: Unresolved types: Exception, ObjectMapper, TypeReference

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.execution_updatable_task import ExecutionUpdatableTask
from engine.core.models.label import Label
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Labels(Task):
    """Add or overwrite labels on the current execution."""
    map_type_reference: ClassVar[TypeReference[dict[str, str]]]
    mapper: ClassVar[ObjectMapper]
    labels: Any

    def update(self, execution: Execution, run_context: RunContext) -> Execution:
        raise NotImplementedError  # TODO: translate from Java
