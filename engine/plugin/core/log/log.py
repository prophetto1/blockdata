from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\log\Log.java
# WARNING: Unresolved types: Exception, Level, Logger

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Log(Task):
    """Emit log entries from a flow."""
    message: Any
    level: Property[Level]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def log(self, logger: Logger, level: Level, message: str) -> None:
        raise NotImplementedError  # TODO: translate from Java
