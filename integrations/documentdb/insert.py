from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-documentdb\src\main\java\io\kestra\plugin\documentdb\Insert.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.documentdb.abstract_document_d_b_task import AbstractDocumentDBTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Insert(AbstractDocumentDBTask):
    """Insert documents into DocumentDB"""
    document: Property[dict[str, Any]] | None = None
    documents: Property[list[dict[str, Any]]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        inserted_id: str | None = None
        inserted_ids: list[str] | None = None
        inserted_count: int | None = None
