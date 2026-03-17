from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\execution\Count.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.statistics.flow import Flow
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State
from engine.core.models.tasks.task import Task
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class Count(Task):
    """Count executions for flows or namespaces (deprecated)."""
    start_date: Property[str]
    expression: str
    flows: list[Flow] | None = None
    states: Property[list[State.Type]] | None = None
    end_date: Property[str] | None = None
    namespaces: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        results: list[Result] | None = None
        total: int | None = None

    @dataclass(slots=True)
    class Result:
        namespace: str | None = None
        flow_id: str | None = None
        count: int | None = None
