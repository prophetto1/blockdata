from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-typesense\src\main\java\io\kestra\plugin\typesense\BulkIndex.java
# WARNING: Unresolved types: Client, Exception, Flux, Logger, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.typesense.abstract_typesense_task import AbstractTypesenseTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class BulkIndex(AbstractTypesenseTask):
    """Bulk upsert documents into Typesense"""
    from: Property[str]
    chunk: Property[int] = Property.ofValue(1000)

    def run(self, run_context: RunContext) -> BulkIndex.Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def bulk_index(client: Client, collection: str, documents: list, logger: Logger) -> Flux[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        size: int | None = None
