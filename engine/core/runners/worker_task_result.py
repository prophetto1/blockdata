from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\WorkerTaskResult.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.has_uid import HasUID
from engine.core.models.executions.task_run import TaskRun


@dataclass(frozen=True, slots=True, kw_only=True)
class WorkerTaskResult:
    task_run: TaskRun
    dynamic_task_runs: list[TaskRun] | None = None

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
