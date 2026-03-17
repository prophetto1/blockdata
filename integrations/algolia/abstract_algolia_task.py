from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractAlgoliaTask(Task, RunnableTask):
    application_id: Property[str]
    api_key: Property[str]

    def client(self, run_context: RunContext) -> SearchClient:
        raise NotImplementedError  # TODO: translate from Java
