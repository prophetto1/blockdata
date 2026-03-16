from __future__ import annotations

import json
from contextlib import closing
from dataclasses import dataclass, field

from blockdata.core.models.property import Property
from blockdata.core.models.tasks.common import FetchType
from blockdata.core.runners.run_context import RunContext
from blockdata.connectors.mongodb.abstract_task import AbstractTask
from blockdata.connectors.mongodb.mongodb_service import MongoDbService


@dataclass(slots=True)
class AggregateOutput:
    rows: list[object] | None = None
    size: int = 0
    uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Aggregate(AbstractTask):
    pipeline: Property[list[dict[str, object]]] | None = None
    allow_disk_use: Property[bool] = field(default_factory=lambda: Property.of_value(True))
    max_time_ms: Property[int] = field(default_factory=lambda: Property.of_value(60_000))
    batch_size: Property[int] = field(default_factory=lambda: Property.of_value(1000))
    store: Property[FetchType] = field(default_factory=lambda: Property.of_value(FetchType.FETCH))

    def run(self, run_context: RunContext) -> AggregateOutput:
        pipeline = run_context.render(self.pipeline).as_list(dict) if self.pipeline is not None else []

        with closing(self.connection.client(run_context)) as client:
            collection = self.resolve_collection(run_context, client)
            try:
                cursor = collection.aggregate(
                    pipeline,
                    allowDiskUse=run_context.render(self.allow_disk_use).as_type(bool).or_else(True),
                )
            except TypeError:
                cursor = collection.aggregate(pipeline)

            rows = [MongoDbService.map_value(document) for document in cursor]

        mode = run_context.render(self.store).as_type(FetchType).or_else(FetchType.FETCH)
        if mode is FetchType.STORE:
            output = self._store_results(run_context, rows)
        else:
            output = AggregateOutput(rows=rows, size=len(rows))

        run_context.metric("records", output.size)
        return output

    def _store_results(self, run_context: RunContext, rows: list[object]) -> AggregateOutput:
        content = "\n".join(json.dumps(row, default=str) for row in rows).encode("utf-8")
        uri = run_context.storage.put_file_bytes("aggregate.jsonl", content)
        return AggregateOutput(rows=None, size=len(rows), uri=uri)
