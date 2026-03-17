from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.openai.open_ai_interface import OpenAiInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(Task, OpenAiInterface):
    api_key: Property[str]
    user: Property[str] | None = None
    client_timeout: int = 10

    def open_a_i_client(self, run_context: RunContext) -> OpenAIClient:
        raise NotImplementedError  # TODO: translate from Java
