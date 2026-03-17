from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.todoist.abstract_todoist_task import AbstractTodoistTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class UpdateTask(AbstractTodoistTask, RunnableTask):
    """Update Todoist task fields"""
    task_id: Property[str]
    content: Property[str] | None = None
    task_description: Property[str] | None = None
    priority: Property[int] | None = None
    due_string: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        task_id: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    task_id: str | None = None
