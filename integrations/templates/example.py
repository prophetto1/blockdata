from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Example(Task, RunnableTask):
    """Short description for this task"""
    format: Property[str] | None = None

    def run(self, run_context: RunContext) -> Example:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        child: OutputChild | None = None

    @dataclass(slots=True)
    class OutputChild(io):
        value: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    child: OutputChild | None = None


@dataclass(slots=True, kw_only=True)
class OutputChild(io):
    value: str | None = None
