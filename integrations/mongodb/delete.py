from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\Delete.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractTask):
    """Delete documents from MongoDB"""
    operation: Property[Operation] = Property.ofValue(Operation.DELETE_ONE)
    filter: Any | None = None

    def run(self, run_context: RunContext) -> Delete.Output:
        raise NotImplementedError  # TODO: translate from Java

    class Operation(str, Enum):
        DELETE_ONE = "DELETE_ONE"
        DELETE_MANY = "DELETE_MANY"

    @dataclass(slots=True)
    class Output:
        was_acknowledged: bool | None = None
        deleted_count: int | None = None
