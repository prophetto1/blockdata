from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\ResolvedTask.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.executions.next_task_run import NextTaskRun
from engine.core.models.tasks.task import Task


@dataclass(frozen=True, slots=True, kw_only=True)
class ResolvedTask:
    task: Task
    value: str | None = None
    iteration: int | None = None
    parent_id: str | None = None

    def to_next_task_run(self, execution: Execution) -> NextTaskRun:
        raise NotImplementedError  # TODO: translate from Java

    def to_next_task_run_increment_iteration(self, execution: Execution, iteration: int) -> NextTaskRun:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(task: Task) -> ResolvedTask:
        raise NotImplementedError  # TODO: translate from Java
