from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\log\Log.java

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Log(Task):
    """Emit log entries from a flow."""
    message: Any
    level: Property[int]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def log(self, logger: Any, level: int, message: str) -> None:
        raise NotImplementedError  # TODO: translate from Java
