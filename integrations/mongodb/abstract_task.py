from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\AbstractTask.java
# WARNING: Unresolved types: Bson, Class, MongoClient, MongoCollection, T

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.mongodb.mongo_db_connection import MongoDbConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(ABC, Task):
    connection: MongoDbConnection
    database: Property[str]
    collection: Property[str]

    def collection(self, run_context: RunContext, client: MongoClient) -> MongoCollection[Bson]:
        raise NotImplementedError  # TODO: translate from Java

    def collection(self, run_context: RunContext, client: MongoClient, cls: Class[T]) -> MongoCollection[T]:
        raise NotImplementedError  # TODO: translate from Java
