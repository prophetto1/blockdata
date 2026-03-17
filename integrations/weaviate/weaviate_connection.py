from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task
from integrations.weaviate.weaviate_connection_interface import WeaviateConnectionInterface


@dataclass(slots=True, kw_only=True)
class WeaviateConnection(Task, WeaviateConnectionInterface):
    url: str | None = None
    api_key: Property[str] | None = None
    headers: Property[dict[String, String]] | None = None

    def connect(self, run_context: RunContext) -> WeaviateClient:
        raise NotImplementedError  # TODO: translate from Java
