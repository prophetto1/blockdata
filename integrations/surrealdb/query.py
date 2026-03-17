from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-surrealdb\src\main\java\io\kestra\plugin\surrealdb\Query.java
# WARNING: Unresolved types: Exception, IOException, QueryResult, Stream, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from integrations.cassandra.query_interface import QueryInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.surrealdb.surreal_d_b_connection import SurrealDBConnection


@dataclass(slots=True, kw_only=True)
class Query(SurrealDBConnection):
    """Run a SurrealDB query"""
    query: str
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.STORE)
    parameters: Property[dict[str, str]] = Property.ofValue(new HashMap<>())

    def run(self, run_context: RunContext) -> Query.Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_result_stream(self, results: list[QueryResult[Any]]) -> Stream[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def get_temp_file(self, run_context: RunContext, results: list[dict[str, Any]]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        rows: list[dict[str, Any]] | None = None
        row: dict[str, Any] | None = None
        uri: str | None = None
        size: int | None = None
