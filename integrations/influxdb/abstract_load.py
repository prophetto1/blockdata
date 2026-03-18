from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-influxdb\src\main\java\io\kestra\plugin\influxdb\AbstractLoad.java
# WARNING: Unresolved types: BufferedReader, Exception, Flux, Point, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AbstractLoad(ABC, AbstractTask):
    from: Property[str]
    chunk: Property[int] = Property.ofValue(1000)

    @abstractmethod
    def source(self, run_context: RunContext, input_stream: BufferedReader) -> Flux[Point]:
        ...

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        record_count: int | None = None
