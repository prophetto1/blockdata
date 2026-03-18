from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-documentdb\src\main\java\io\kestra\plugin\documentdb\Read.java
# WARNING: Unresolved types: Exception, IOException, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.documentdb.abstract_document_d_b_task import AbstractDocumentDBTask
from integrations.documentdb.models.document_d_b_record import DocumentDBRecord
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Read(AbstractDocumentDBTask):
    """Read documents from DocumentDB"""
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.FETCH)
    filter: Property[dict[str, Any]] | None = None
    aggregation_pipeline: Property[list[dict[str, Any]]] | None = None
    limit: Property[int] | None = None
    skip: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def convert_record_to_map(self, record: DocumentDBRecord) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def store_records_as_file(self, run_context: RunContext, records: list[DocumentDBRecord]) -> StoredResult:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class StoredResult:
        uri: str | None = None
        count: int | None = None

        def get_uri(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def get_count(self) -> int:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        row: dict[str, Any] | None = None
        rows: list[dict[str, Any]] | None = None
        uri: str | None = None
        size: int | None = None
