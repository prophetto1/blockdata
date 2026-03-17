from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AbstractLoad(AbstractTask, RunnableTask):
    from: Property[str]
    chunk: Property[int] | None = None

    def source(self, run_context: RunContext, input_stream: BufferedReader) -> Flux[Point]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        record_count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    record_count: int | None = None
