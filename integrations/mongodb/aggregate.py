from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\Aggregate.java
# WARNING: Unresolved types: AggregateIterable, BsonDocument, Exception, IOException, Pair, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Aggregate(AbstractTask):
    """Run an aggregation pipeline"""
    pipeline: Property[list[dict[str, Any]]]
    allow_disk_use: Property[bool] = Property.ofValue(true)
    max_time_ms: Property[int] = Property.ofValue((int) Duration.ofSeconds(60).toMillis())
    batch_size: Property[int] = Property.ofValue(1000)
    store: Property[FetchType] = Property.ofValue(FetchType.FETCH)

    def run(self, run_context: RunContext) -> Aggregate.Output:
        raise NotImplementedError  # TODO: translate from Java

    def store(self, run_context: RunContext, documents: AggregateIterable[BsonDocument]) -> Pair[str, int]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch(self, documents: AggregateIterable[BsonDocument]) -> Pair[list[Any], int]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        rows: list[Any] | None = None
        size: int | None = None
        uri: str | None = None
