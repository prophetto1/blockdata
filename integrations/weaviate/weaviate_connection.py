from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-weaviate\src\main\java\io\kestra\plugin\weaviate\WeaviateConnection.java
# WARNING: Unresolved types: AuthException, WeaviateClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task
from integrations.weaviate.weaviate_connection_interface import WeaviateConnectionInterface


@dataclass(slots=True, kw_only=True)
class WeaviateConnection(ABC, Task):
    url: str | None = None
    api_key: Property[str] | None = None
    headers: Property[dict[str, str]] | None = None

    def connect(self, run_context: RunContext) -> WeaviateClient:
        raise NotImplementedError  # TODO: translate from Java
