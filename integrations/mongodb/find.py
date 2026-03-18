from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\Find.java
# WARNING: Unresolved types: BsonDocument, Exception, FindIterable, IOException, Pair, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Find(AbstractTask):
    """Query documents from MongoDB"""
    store: Property[bool] = Property.ofValue(false)
    filter: Any | None = None
    projection: Any | None = None
    sort: Any | None = None
    limit: Property[int] | None = None
    skip: Property[int] | None = None

    def run(self, run_context: RunContext) -> Find.Output:
        raise NotImplementedError  # TODO: translate from Java

    def store(self, run_context: RunContext, documents: FindIterable[BsonDocument]) -> Pair[str, int]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch(self, documents: FindIterable[BsonDocument]) -> Pair[list[Any], int]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        rows: list[Any] | None = None
        size: int | None = None
        uri: str | None = None
