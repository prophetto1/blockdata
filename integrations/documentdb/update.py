from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-documentdb\src\main\java\io\kestra\plugin\documentdb\Update.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.documentdb.abstract_document_d_b_task import AbstractDocumentDBTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Update(AbstractDocumentDBTask):
    """Update documents in DocumentDB"""
    update: Property[dict[str, Any]]
    update_many: Property[bool] = Property.ofValue(false)
    filter: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        matched_count: int | None = None
        modified_count: int | None = None
        upserted_id: str | None = None
