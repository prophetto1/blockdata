from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.meilisearch.meilisearch_connection_interface import MeilisearchConnectionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractMeilisearchConnection(Task, MeilisearchConnectionInterface):
    url: Property[str] | None = None
    key: Property[str] | None = None

    def create_client(self, run_context: RunContext) -> Client:
        raise NotImplementedError  # TODO: translate from Java
