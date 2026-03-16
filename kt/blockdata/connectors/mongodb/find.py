from __future__ import annotations

import json
from contextlib import closing
from dataclasses import dataclass, field

from blockdata.core.models.property import Property
from blockdata.core.runners.run_context import RunContext
from blockdata.connectors.mongodb.abstract_task import AbstractTask
from blockdata.connectors.mongodb.mongodb_service import MongoDbService


@dataclass(slots=True)
class FindOutput:
    rows: list[object] | None = None
    size: int = 0
    uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Find(AbstractTask):
    filter: object | None = None
    projection: object | None = None
    sort: object | None = None
    limit: Property[int] | None = None
    skip: Property[int] | None = None
    store: Property[bool] = field(default_factory=lambda: Property.of_value(False))

    def run(self, run_context: RunContext) -> FindOutput:
        with closing(self.connection.client(run_context)) as client:
            collection = self.resolve_collection(run_context, client)
            bson_filter = MongoDbService.to_document(run_context, self.filter)
            projection = MongoDbService.to_document(run_context, self.projection) if self.projection is not None else None
            cursor = collection.find(bson_filter, projection)

            if self.sort is not None:
                sort_document = MongoDbService.to_document(run_context, self.sort)
                cursor = cursor.sort(list(sort_document.items()))

            if self.limit is not None:
                limit = run_context.render(self.limit).as_type(int).or_else(None)
                if limit:
                    cursor = cursor.limit(limit)

            if self.skip is not None:
                skip = run_context.render(self.skip).as_type(int).or_else(None)
                if skip:
                    cursor = cursor.skip(skip)

            rows = [MongoDbService.map_value(document) for document in cursor]

        output = FindOutput(rows=rows, size=len(rows))
        if run_context.render(self.store).as_type(bool).or_else(False):
            output = self._store_results(run_context, rows)

        run_context.metric("records", output.size)
        return output

    def _store_results(self, run_context: RunContext, rows: list[object]) -> FindOutput:
        content = "\n".join(json.dumps(row, default=str) for row in rows).encode("utf-8")
        uri = run_context.storage.put_file_bytes("find.jsonl", content)
        return FindOutput(rows=None, size=len(rows), uri=uri)
