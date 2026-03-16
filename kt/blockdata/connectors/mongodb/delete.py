from __future__ import annotations

from contextlib import closing
from dataclasses import dataclass, field
from enum import Enum

from blockdata.core.models.property import Property
from blockdata.core.runners.run_context import RunContext
from blockdata.connectors.mongodb.abstract_task import AbstractTask
from blockdata.connectors.mongodb.mongodb_service import MongoDbService


class DeleteOperation(str, Enum):
    DELETE_ONE = "DELETE_ONE"
    DELETE_MANY = "DELETE_MANY"


@dataclass(slots=True)
class DeleteOutput:
    was_acknowledged: bool
    deleted_count: int


@dataclass(slots=True, kw_only=True)
class Delete(AbstractTask):
    filter: object | None = None
    operation: Property[DeleteOperation] = field(
        default_factory=lambda: Property.of_value(DeleteOperation.DELETE_ONE)
    )

    def run(self, run_context: RunContext) -> DeleteOutput:
        with closing(self.connection.client(run_context)) as client:
            collection = self.resolve_collection(run_context, client)
            bson_filter = MongoDbService.to_document(run_context, self.filter)
            operation = run_context.render(self.operation).as_type(DeleteOperation).or_else_throw()

            if operation is DeleteOperation.DELETE_ONE:
                result = collection.delete_one(bson_filter)
            else:
                result = collection.delete_many(bson_filter)

        run_context.metric("deleted.count", int(getattr(result, "deleted_count", 0)))
        return DeleteOutput(
            was_acknowledged=bool(getattr(result, "acknowledged", True)),
            deleted_count=int(getattr(result, "deleted_count", 0)),
        )
