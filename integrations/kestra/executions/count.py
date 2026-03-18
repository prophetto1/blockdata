from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\executions\Count.java
# WARNING: Unresolved types: Exception, StateType, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.git.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Count(AbstractKestraTask):
    """Count executions by filters"""
    namespaces: Property[list[str]] | None = None
    flow_id: Property[str] | None = None
    states: Property[list[StateType]] | None = None
    start_date: Property[str] | None = None
    end_date: Property[str] | None = None
    expression: str | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int | None = None
