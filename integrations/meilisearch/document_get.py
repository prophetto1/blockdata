from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meilisearch\src\main\java\io\kestra\plugin\meilisearch\DocumentGet.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.meilisearch.abstract_meilisearch_connection import AbstractMeilisearchConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DocumentGet(AbstractMeilisearchConnection):
    """Fetch document from Meilisearch"""
    document_id: Property[str]
    index: Property[str]

    def run(self, run_context: RunContext) -> DocumentGet.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        document: dict[str, Any] | None = None
