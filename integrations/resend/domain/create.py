from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Create(Task, RunnableTask):
    """Provision a Resend sending domain"""
    api_key: Property[str]
    name: Property[str]
    region: Property[str] | None = None
    custom_return_path: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        id: str | None = None
        result: dict[String, Object] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    id: str | None = None
    result: dict[String, Object] | None = None
