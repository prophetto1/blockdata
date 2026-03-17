from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractGemini(Task):
    api_key: Property[str]
    model: Property[str]

    def send_metrics(self, run_context: RunContext, metadata: list[GenerateContentResponseUsageMetadata]) -> None:
        raise NotImplementedError  # TODO: translate from Java
