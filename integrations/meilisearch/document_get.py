from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.meilisearch.abstract_meilisearch_connection import AbstractMeilisearchConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DocumentGet(AbstractMeilisearchConnection, RunnableTask):
    """Fetch document from Meilisearch"""
    document_id: Property[str]
    index: Property[str]

    def run(self, run_context: RunContext) -> DocumentGet:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        document: dict[String, Object] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    document: dict[String, Object] | None = None
