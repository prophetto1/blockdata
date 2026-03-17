from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class IonToXml(Task, RunnableTask):
    """Convert an ION file into XML."""
    from: Property[str]
    charset: Property[str] | None = None
    root_name: Property[str]
    time_zone_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> IonToXml:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
