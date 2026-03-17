from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class Operation(str, Enum):
    REPLACE_ONE = "REPLACE_ONE"
    UPDATE_ONE = "UPDATE_ONE"
    UPDATE_MANY = "UPDATE_MANY"


@dataclass(slots=True, kw_only=True)
class Update(AbstractTask, RunnableTask):
    """Update or replace MongoDB documents"""
    document: Any
    filter: Any
    operation: Property[Operation] | None = None

    def run(self, run_context: RunContext) -> Update:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        upserted_id: str | None = None
        was_acknowledged: bool | None = None
        matched_count: int | None = None
        modified_count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    upserted_id: str | None = None
    was_acknowledged: bool | None = None
    matched_count: int | None = None
    modified_count: int | None = None
