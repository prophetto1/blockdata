from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.webserver.responses.bulk_response import BulkResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AbstractLoad(AbstractTask, RunnableTask):
    from: str
    chunk: Property[int] | None = None

    def source(self, run_context: RunContext, input_stream: BufferedReader) -> Flux[BulkOperation]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> AbstractLoad:
        raise NotImplementedError  # TODO: translate from Java

    def execute_bulk(self, run_context: RunContext, client: ElasticsearchClient, operation_flux: Flux[BulkOperation], buffer_size: int) -> AtomicLong:
        raise NotImplementedError  # TODO: translate from Java

    def log_error(self, bulk_response: BulkResponse) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        size: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    size: int | None = None
