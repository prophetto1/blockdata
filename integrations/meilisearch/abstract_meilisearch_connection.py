from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meilisearch\src\main\java\io\kestra\plugin\meilisearch\AbstractMeilisearchConnection.java
# WARNING: Unresolved types: Client

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.meilisearch.meilisearch_connection_interface import MeilisearchConnectionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractMeilisearchConnection(ABC, Task):
    url: Property[str] | None = None
    key: Property[str] | None = None

    def create_client(self, run_context: RunContext) -> Client:
        raise NotImplementedError  # TODO: translate from Java
