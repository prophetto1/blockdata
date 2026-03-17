from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-tencent\src\main\java\io\kestra\plugin\templates\Example.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class Example(Task):
    """Short description for this task"""
    format: Property[str] | None = None

    def run(self, run_context: RunContext) -> Example.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        child: OutputChild | None = None

    @dataclass(slots=True)
    class OutputChild:
        value: str | None = None
