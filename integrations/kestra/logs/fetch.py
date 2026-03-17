from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kestra.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Fetch(AbstractKestraTask, RunnableTask):
    """Fetch execution logs to storage"""
    namespace: Property[str] | None = None
    flow_id: Property[str] | None = None
    execution_id: Property[str] | None = None
    tasks_id: Property[list[String]] | None = None
    level: Property[Level] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        size: int | None = None
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    size: int | None = None
    uri: str | None = None
