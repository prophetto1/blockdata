from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\output\OutputValues.java

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class OutputValues(Task):
    """Emit custom values from a task."""
    values: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> OutputValues.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        values: dict[str, Any] | None = None
