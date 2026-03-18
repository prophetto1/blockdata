from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-weaviate\src\main\java\io\kestra\plugin\weaviate\Query.java
# WARNING: Unresolved types: Exception, GraphQLResponse, IOException

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.common.fetch_output import FetchOutput
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.models.collectors.result import Result
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.weaviate.weaviate_connection import WeaviateConnection


@dataclass(slots=True, kw_only=True)
class Query(WeaviateConnection):
    """Run GraphQL query against Weaviate"""
    query: str
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.STORE)

    def run(self, run_context: RunContext) -> FetchOutput:
        raise NotImplementedError  # TODO: translate from Java

    def store(self, data: list[Any], run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_result_by_class_name(self, result: Result[GraphQLResponse]) -> dict[str, list[dict[str, Any]]]:
        raise NotImplementedError  # TODO: translate from Java

    def extract_row(self, result: Result[GraphQLResponse]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def extract_rows(self, result: Result[GraphQLResponse]) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java
