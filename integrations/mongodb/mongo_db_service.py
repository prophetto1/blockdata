from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\MongoDbService.java
# WARNING: Unresolved types: BsonDocument, BsonValue, IOException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class MongoDbService(ABC):

    @staticmethod
    def to_document(run_context: RunContext, value: Any) -> BsonDocument:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def map(doc: BsonValue) -> Any:
        raise NotImplementedError  # TODO: translate from Java
