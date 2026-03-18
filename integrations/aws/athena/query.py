from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\athena\Query.java
# WARNING: Unresolved types: AthenaClient, ColumnInfo, DateTimeFormatter, Datum, Exception, IOException, InterruptedException, Pair, QueryExecutionStatistics, Row

from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Query(AbstractConnection):
    """Run an Athena query and fetch results"""
    database: Property[str]
    output_location: Property[str]
    query: Property[str]
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.STORE)
    skip_header: Property[bool] = Property.ofValue(true)
    date_formatter: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    timestamp_formatter: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS")
    catalog: Property[str] | None = None

    def run(self, run_context: RunContext) -> QueryOutput:
        raise NotImplementedError  # TODO: translate from Java

    def athena_client(self, run_context: RunContext) -> AthenaClient:
        raise NotImplementedError  # TODO: translate from Java

    def client(self, run_context: RunContext) -> AthenaClient:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_query_to_complete(self, client: AthenaClient, query_execution_id: str) -> QueryExecutionStatistics:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_one(self, column_info: list[ColumnInfo], results: list[Row]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch(self, column_info: list[ColumnInfo], results: list[Row]) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def store(self, column_info: list[ColumnInfo], results: list[Row], run_context: RunContext) -> Pair[str, int]:
        raise NotImplementedError  # TODO: translate from Java

    def map(self, column_info: list[ColumnInfo], row: Row) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def map_cell(self, column_info: ColumnInfo, datum: Datum) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class QueryOutput:
        query_execution_id: str | None = None
        rows: list[Any] | None = None
        row: dict[str, Any] | None = None
        uri: str | None = None
        size: int | None = None
