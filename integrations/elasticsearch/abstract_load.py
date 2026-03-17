from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\AbstractLoad.java
# WARNING: Unresolved types: AtomicLong, BufferedReader, BulkOperation, ElasticsearchClient, Exception, Flux, IOException, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.webserver.responses.bulk_response import BulkResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AbstractLoad(ABC, AbstractTask):
    from: str
    chunk: Property[int] = Property.ofValue(1000)

    @abstractmethod
    def source(self, run_context: RunContext, input_stream: BufferedReader) -> Flux[BulkOperation]:
        ...

    def run(self, run_context: RunContext) -> AbstractLoad.Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def execute_bulk(run_context: RunContext, client: ElasticsearchClient, operation_flux: Flux[BulkOperation], buffer_size: int) -> AtomicLong:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_error(bulk_response: BulkResponse) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        size: int | None = None
