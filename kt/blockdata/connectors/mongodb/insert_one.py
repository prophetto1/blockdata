from __future__ import annotations

from contextlib import closing
from dataclasses import dataclass

from blockdata.core.runners.run_context import RunContext
from blockdata.connectors.mongodb.abstract_task import AbstractTask
from blockdata.connectors.mongodb.mongodb_service import MongoDbService


@dataclass(slots=True)
class InsertOneOutput:
    inserted_id: str
    was_acknowledged: bool


@dataclass(slots=True, kw_only=True)
class InsertOne(AbstractTask):
    document: object

    def run(self, run_context: RunContext) -> InsertOneOutput:
        with closing(self.connection.client(run_context)) as client:
            collection = self.resolve_collection(run_context, client)
            bson_document = MongoDbService.to_document(run_context, self.document)
            result = collection.insert_one(bson_document)

        run_context.metric("inserted.count", 1)
        return InsertOneOutput(
            inserted_id=str(result.inserted_id),
            was_acknowledged=bool(getattr(result, "acknowledged", True)),
        )
