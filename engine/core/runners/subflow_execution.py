from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\SubflowExecution.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.executable_task import ExecutableTask
from engine.core.models.executions.execution import Execution
from engine.core.models.has_uid import HasUID
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun


@dataclass(slots=True, kw_only=True)
class SubflowExecution:
    parent_task_run: TaskRun
    parent_task: T
    execution: Execution

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
