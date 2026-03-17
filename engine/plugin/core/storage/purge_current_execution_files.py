from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\storage\PurgeCurrentExecutionFiles.java

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class PurgeCurrentExecutionFiles(Task):
    """Purge files created by the current Execution."""

    def run(self, run_context: RunContext) -> PurgeCurrentExecutionFiles.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uris: list[str] | None = None
