from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractYoutubeTask(Task):
    access_token: Property[str]
    application_name: Property[str] | None = None

    def create_youtube_service(self, run_context: RunContext) -> YouTube:
        raise NotImplementedError  # TODO: translate from Java
