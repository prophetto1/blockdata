from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\TaskForExecution.java
# WARNING: Unresolved types: SubflowId

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.executable_task import ExecutableTask
from engine.core.models.flows.input import Input
from engine.core.models.tasks.task_interface import TaskInterface


@dataclass(slots=True, kw_only=True)
class TaskForExecution:
    id: str | None = None
    type: str | None = None
    version: str | None = None
    tasks: list[TaskForExecution] | None = None
    inputs: list[Input[Any]] | None = None
    subflow_id: ExecutableTask.SubflowId | None = None

    @staticmethod
    def of(task: TaskInterface) -> TaskForExecution:
        raise NotImplementedError  # TODO: translate from Java
