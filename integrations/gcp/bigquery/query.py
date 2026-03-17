from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\Query.java
# WARNING: Unresolved types: Exception, FieldValue, FieldValueList, IOException, JobStatistics, Priority, QueryJobConfiguration, QueryStatistics, SchemaUpdateOption, TableResult, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.gcp.bigquery.abstract_job import AbstractJob
from integrations.aws.eventbridge.model.entry import Entry
from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.gcp.bigquery.models.field import Field
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.airbyte.models.job import Job
from integrations.airbyte.models.job_info import JobInfo
from engine.core.models.property.property import Property
from integrations.cassandra.query_interface import QueryInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.gcp.bigquery.models.time_partitioning import TimePartitioning
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class Query(AbstractJob):
    """Execute a BigQuery SQL job"""
    legacy_sql: Property[bool] = Property.ofValue(false)
    fetch: bool = False
    store: bool = False
    fetch_one: bool = False
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.NONE)
    time_partitioning_type: Property[TimePartitioning.Type] = Property.ofValue(TimePartitioning.Type.DAY)
    priority: Property[QueryJobConfiguration.Priority] = Property.ofValue(QueryJobConfiguration.Priority.INTERACTIVE)
    flatten_results: Property[bool] = Property.ofValue(true)
    use_legacy_sql: Property[bool] = Property.ofValue(false)
    sql: Property[str] | None = None
    clustering_fields: Property[list[str]] | None = None
    schema_update_options: Property[list[JobInfo.SchemaUpdateOption]] | None = None
    time_partitioning_field: Property[str] | None = None
    range_partitioning_field: Property[str] | None = None
    range_partitioning_start: Property[int] | None = None
    range_partitioning_end: Property[int] | None = None
    range_partitioning_interval: Property[int] | None = None
    default_dataset: Property[str] | None = None
    allow_large_results: Property[bool] | None = None
    use_query_cache: Property[bool] | None = None
    maximum_billing_tier: Property[int] | None = None
    maximum_bytes_billed: Property[int] | None = None
    max_results: Property[int] | None = None

    def run(self, run_context: RunContext) -> Query.Output:
        raise NotImplementedError  # TODO: translate from Java

    def job_configuration(self, run_context: RunContext) -> QueryJobConfiguration:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self, stats: JobStatistics.QueryStatistics, query_job: Job, fetch_type: FetchType) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def metrics(self, run_context: RunContext, stats: JobStatistics.QueryStatistics, query_job: Job, fetch_type_rendered: FetchType) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_result(self, result: TableResult) -> list[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def store_result(self, result: TableResult, run_context: RunContext) -> Map.Entry[str, int]:
        raise NotImplementedError  # TODO: translate from Java

    def convert_rows(self, result: TableResult, field_values: FieldValueList) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def convert_cell(self, field: Field, value: FieldValue, is_repeated: bool) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        job_id: str | None = None
        rows: list[dict[str, Any]] | None = None
        row: dict[str, Any] | None = None
        size: int | None = None
        uri: str | None = None
        destination_table: DestinationTable | None = None

    @dataclass(slots=True)
    class DestinationTable:
        project: str | None = None
        dataset: str | None = None
        table: str | None = None

        def get_project(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def get_dataset(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def get_table(self) -> str:
            raise NotImplementedError  # TODO: translate from Java
