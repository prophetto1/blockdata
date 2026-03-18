from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-typesense\src\main\java\io\kestra\plugin\typesense\AbstractTypesenseTask.java
# WARNING: Unresolved types: Client

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTypesenseTask(ABC, Task):
    host: Property[str]
    port: Property[str]
    api_key: Property[str]
    collection: Property[str]
    https: Property[bool] | None = None

    def get_client(self, context: RunContext) -> Client:
        raise NotImplementedError  # TODO: translate from Java

    def render_collection(self, context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render_string(self, property: Property[str], context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
