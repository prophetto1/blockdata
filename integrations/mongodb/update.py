from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\Update.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Update(AbstractTask):
    """Update or replace MongoDB documents"""
    document: Any
    filter: Any
    operation: Property[Operation] = Property.ofValue(Operation.UPDATE_ONE)

    def run(self, run_context: RunContext) -> Update.Output:
        raise NotImplementedError  # TODO: translate from Java

    class Operation(str, Enum):
        REPLACE_ONE = "REPLACE_ONE"
        UPDATE_ONE = "UPDATE_ONE"
        UPDATE_MANY = "UPDATE_MANY"

    @dataclass(slots=True)
    class Output:
        upserted_id: str | None = None
        was_acknowledged: bool | None = None
        matched_count: int | None = None
        modified_count: int | None = None
