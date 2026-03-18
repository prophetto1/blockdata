from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\debug\Return.java

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Return(Task):
    """Return a value for debugging purposes."""
    format: Property[str] | None = None

    def run(self, run_context: RunContext) -> Return.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        value: str | None = None
