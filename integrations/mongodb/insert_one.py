from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class InsertOne(AbstractTask, RunnableTask):
    """Insert one document into MongoDB"""
    document: Any

    def run(self, run_context: RunContext) -> InsertOne:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        inserted_id: str | None = None
        was_acknowledged: bool | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    inserted_id: str | None = None
    was_acknowledged: bool | None = None
