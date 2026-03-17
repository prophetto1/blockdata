from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractPipedriveTask(Task):
    api_token: Property[str]
    api_url: Property[str]

    def render_api_token(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render_api_url(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
