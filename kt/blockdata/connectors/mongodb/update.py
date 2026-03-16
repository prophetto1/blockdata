from __future__ import annotations

from contextlib import closing
from dataclasses import dataclass, field
from enum import Enum

from blockdata.core.models.property import Property
from blockdata.core.runners.run_context import RunContext
from blockdata.connectors.mongodb.abstract_task import AbstractTask
from blockdata.connectors.mongodb.mongodb_service import MongoDbService


class UpdateOperation(str, Enum):
    REPLACE_ONE = "REPLACE_ONE"
    UPDATE_ONE = "UPDATE_ONE"
    UPDATE_MANY = "UPDATE_MANY"


@dataclass(slots=True)
class UpdateOutput:
    upserted_id: str | None
    was_acknowledged: bool
    matched_count: int
    modified_count: int


@dataclass(slots=True, kw_only=True)
class Update(AbstractTask):
    document: object
    filter: object
    operation: Property[UpdateOperation] = field(
        default_factory=lambda: Property.of_value(UpdateOperation.UPDATE_ONE)
    )

    def run(self, run_context: RunContext) -> UpdateOutput:
        with closing(self.connection.client(run_context)) as client:
            collection = self.resolve_collection(run_context, client)
            bson_document = MongoDbService.to_document(run_context, self.document)
            bson_filter = MongoDbService.to_document(run_context, self.filter)
            operation = run_context.render(self.operation).as_type(UpdateOperation).or_else_throw()

            if operation is UpdateOperation.REPLACE_ONE:
                result = collection.replace_one(bson_filter, bson_document)
            elif operation is UpdateOperation.UPDATE_ONE:
                result = collection.update_one(bson_filter, bson_document)
            else:
                result = collection.update_many(bson_filter, bson_document)

        run_context.metric("updated.count", int(getattr(result, "modified_count", 0)))
        upserted_id = getattr(result, "upserted_id", None)
        return UpdateOutput(
            upserted_id=str(upserted_id) if upserted_id is not None else None,
            was_acknowledged=bool(getattr(result, "acknowledged", True)),
            matched_count=int(getattr(result, "matched_count", 0)),
            modified_count=int(getattr(result, "modified_count", 0)),
        )
