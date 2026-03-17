from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractFacebookTask(Task, RunnableTask):
    page_id: Property[str]
    access_token: Property[str]
    api_version: Property[str] | None = None
    api_base_url: Property[str] | None = None

    def build_api_url(self, run_context: RunContext, endpoint: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
