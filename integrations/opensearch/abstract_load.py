from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-opensearch\src\main\java\io\kestra\plugin\opensearch\AbstractLoad.java
# WARNING: Unresolved types: BufferedReader, BulkOperation, Exception, Flux, IOException, core, io, kestra, models, tasks

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
    from: Property[str]
    chunk: Property[int] = Property.ofValue(1000)

    @abstractmethod
    def source(self, run_context: RunContext, input_stream: BufferedReader) -> Flux[BulkOperation]:
        ...

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def log_error(self, bulk_response: BulkResponse) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        size: int | None = None
