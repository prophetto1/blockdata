from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-todoist\src\main\java\io\kestra\plugin\todoist\CompleteTask.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.todoist.abstract_todoist_task import AbstractTodoistTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class CompleteTask(AbstractTodoistTask):
    """Complete Todoist task"""
    task_id: Property[str]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
