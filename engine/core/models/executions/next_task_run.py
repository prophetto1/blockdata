from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\NextTaskRun.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun


@dataclass(frozen=True, slots=True, kw_only=True)
class NextTaskRun:
    task_run: TaskRun
    task: Task
