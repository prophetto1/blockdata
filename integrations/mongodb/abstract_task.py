from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.mongodb.mongo_db_connection import MongoDbConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(Task):
    connection: MongoDbConnection
    database: Property[str]
    collection: Property[str]

    def collection(self, run_context: RunContext, client: MongoClient) -> MongoCollection[Bson]:
        raise NotImplementedError  # TODO: translate from Java

    def collection(self, run_context: RunContext, client: MongoClient, cls: Class[T]) -> MongoCollection[T]:
        raise NotImplementedError  # TODO: translate from Java
