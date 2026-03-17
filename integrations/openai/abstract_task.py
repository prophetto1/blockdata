from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-openai\src\main\java\io\kestra\plugin\openai\AbstractTask.java
# WARNING: Unresolved types: OpenAIClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.openai.open_ai_interface import OpenAiInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(ABC, Task):
    api_key: Property[str]
    client_timeout: int = 10
    user: Property[str] | None = None

    def open_a_i_client(self, run_context: RunContext) -> OpenAIClient:
        raise NotImplementedError  # TODO: translate from Java
