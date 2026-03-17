from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pipedrive\src\main\java\io\kestra\plugin\pipedrive\AbstractPipedriveTask.java
# WARNING: Unresolved types: IllegalArgumentException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractPipedriveTask(ABC, Task):
    api_token: Property[str]
    api_url: Property[str] = Property.ofValue(PipedriveClient.DEFAULT_BASE_URL)

    def render_api_token(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render_api_url(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
