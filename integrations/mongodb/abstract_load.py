from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\AbstractLoad.java
# WARNING: Unresolved types: Bson, BufferedReader, Exception, Flux, WriteModel, core, io, kestra, models, tasks

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
    def source(self, run_context: RunContext, input_stream: BufferedReader) -> Flux[WriteModel[Bson]]:
        ...

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        inserted_count: int = 0
        matched_count: int = 0
        deleted_count: int = 0
        modified_count: int = 0
        size: int | None = None
