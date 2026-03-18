from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\dynamodb\AbstractDynamoDb.java
# WARNING: Unresolved types: AttributeValue, DynamoDbClient, IOException, Pair

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from engine.core.models.tasks.common.fetch_output import FetchOutput
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractDynamoDb(ABC, AbstractConnection):
    table_name: Property[str]

    def client(self, run_context: RunContext) -> DynamoDbClient:
        raise NotImplementedError  # TODO: translate from Java

    def object_map_from(self, fields: dict[str, AttributeValue]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def object_from(self, value: AttributeValue) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def value_map_from(self, fields: dict[str, Any]) -> dict[str, AttributeValue]:
        raise NotImplementedError  # TODO: translate from Java

    def object_from(self, value: Any) -> AttributeValue:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_outputs(self, items: list[dict[str, AttributeValue]], fetch_type: FetchType, run_context: RunContext) -> FetchOutput:
        raise NotImplementedError  # TODO: translate from Java

    def store(self, run_context: RunContext, items: list[dict[str, AttributeValue]]) -> Pair[str, int]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch(self, items: list[dict[str, AttributeValue]]) -> Pair[list[Any], int]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_one(self, items: list[dict[str, AttributeValue]]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
