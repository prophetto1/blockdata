from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-todoist\src\main\java\io\kestra\plugin\todoist\CreateTask.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.todoist.abstract_todoist_task import AbstractTodoistTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateTask(AbstractTodoistTask):
    """Create Todoist task"""
    content: Property[str]
    task_description: Property[str] | None = None
    priority: Property[int] | None = None
    project_id: Property[str] | None = None
    due_string: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        task_id: str | None = None
