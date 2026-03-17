from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\MongoDbConnection.java
# WARNING: Unresolved types: MongoClient

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class MongoDbConnection:
    uri: Property[@NotEmpty String]

    def client(self, run_context: RunContext) -> MongoClient:
        raise NotImplementedError  # TODO: translate from Java
