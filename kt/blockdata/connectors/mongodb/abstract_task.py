from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from blockdata.core.models.property import Property
from blockdata.core.models.tasks.task import Task
from blockdata.core.runners.run_context import RunContext
from blockdata.connectors.mongodb.mongodb_connection import MongoDbConnection


@dataclass(slots=True, kw_only=True)
class AbstractTask(Task):
    connection: MongoDbConnection
    database: Property[str]
    collection: Property[str]

    def resolve_collection(self, run_context: RunContext, client: Any):
        database_name = run_context.render(self.database).as_type(str).or_else_throw()
        collection_name = run_context.render(self.collection).as_type(str).or_else_throw()
        return client.get_database(database_name).get_collection(collection_name)
