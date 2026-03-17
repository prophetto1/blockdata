from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class HttpFunction(Task, RunnableTask):
    """Invoke an Azure Function over HTTP"""
    http_method: Property[str]
    url: Property[str]
    http_body: Property[dict[String, Object]] | None = None
    max_duration: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> HttpFunction:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        repsonse_body: Any | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    repsonse_body: Any | None = None
