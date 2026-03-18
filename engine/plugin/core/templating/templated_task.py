from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\templating\TemplatedTask.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.tasks.output import Output
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class TemplatedTask(Task):
    """Render and run a task from a templated spec."""
    object_mapper: ClassVar[ObjectMapper]
    spec: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
