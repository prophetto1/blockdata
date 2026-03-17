from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kestra.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Count(AbstractKestraTask, RunnableTask):
    """Count executions by filters"""
    namespaces: Property[list[String]] | None = None
    flow_id: Property[str] | None = None
    states: Property[list[StateType]] | None = None
    start_date: Property[str] | None = None
    end_date: Property[str] | None = None
    expression: str | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    count: int | None = None
