from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class Operation(str, Enum):
    DELETE_ONE = "DELETE_ONE"
    DELETE_MANY = "DELETE_MANY"


@dataclass(slots=True, kw_only=True)
class Delete(AbstractTask, RunnableTask):
    """Delete documents from MongoDB"""
    filter: Any | None = None
    operation: Property[Operation]

    def run(self, run_context: RunContext) -> Delete:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        was_acknowledged: bool | None = None
        deleted_count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    was_acknowledged: bool | None = None
    deleted_count: int | None = None
