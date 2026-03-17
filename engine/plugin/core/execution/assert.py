from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\execution\Assert.java

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Assert(Task):
    """Assert boolean expressions against execution data."""
    conditions: list[str]
    error_message: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
