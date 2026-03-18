from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\log\PurgeLogs.java

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class PurgeLogs(Task):
    """Purge execution and trigger logs."""
    end_date: Property[str]
    namespace: Property[str] | None = None
    flow_id: Property[str] | None = None
    execution_id: Property[str] | None = None
    log_levels: Property[list[int]] | None = None
    start_date: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int | None = None
