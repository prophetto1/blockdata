from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.typesense.abstract_typesense_task import AbstractTypesenseTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class BulkIndex(AbstractTypesenseTask, RunnableTask):
    """Bulk upsert documents into Typesense"""
    from: Property[str]
    chunk: Property[int] | None = None

    def run(self, run_context: RunContext) -> BulkIndex:
        raise NotImplementedError  # TODO: translate from Java

    def bulk_index(self, client: Client, collection: str, documents: list, logger: Logger) -> Flux[String]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        size: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    size: int | None = None
