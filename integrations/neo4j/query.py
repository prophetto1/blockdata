from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-neo4j\src\main\java\io\kestra\plugin\neo4j\Query.java
# WARNING: Unresolved types: Exception, IOException, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.neo4j.abstract_neo4j_connection import AbstractNeo4jConnection
from integrations.aws.eventbridge.model.entry import Entry
from engine.core.models.property.property import Property
from engine.core.models.collectors.result import Result
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.neo4j.models.store_type import StoreType


@dataclass(slots=True, kw_only=True)
class Query(AbstractNeo4jConnection):
    """Execute a Neo4j Cypher query"""
    store_type: Property[StoreType] = Property.ofValue(StoreType.NONE)
    query: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def store_result(self, result: Result, run_context: RunContext) -> Map.Entry[str, int]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_result(self, result: Result) -> list[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        rows: list[dict[str, Any]] | None = None
        row: dict[str, Any] | None = None
        uri: str | None = None
        size: int | None = None
