from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\AbstractLoad.java
# WARNING: Unresolved types: Builder, CreateDisposition, InterruptedException, JobStatistics, JsonProcessingException, LoadConfiguration, LoadStatistics, SchemaUpdateOption, WriteDisposition, bigquery, cloud, com, core, google, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.gcp.bigquery.abstract_bigquery import AbstractBigquery
from integrations.gcp.bigquery.big_query_exception import BigQueryException
from integrations.gcp.bigquery.models.field import Field
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.airbyte.models.job import Job
from integrations.airbyte.models.job_info import JobInfo
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.gcp.bigquery.models.schema import Schema
from integrations.gcp.bigquery.models.time_partitioning import TimePartitioning
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class AbstractLoad(ABC, AbstractBigquery):
    time_partitioning_type: Property[TimePartitioning.Type] = Property.ofValue(TimePartitioning.Type.DAY)
    destination_table: Property[str] | None = None
    clustering_fields: Property[list[str]] | None = None
    schema_update_options: Property[list[JobInfo.SchemaUpdateOption]] | None = None
    time_partitioning_field: Property[str] | None = None
    write_disposition: Property[JobInfo.WriteDisposition] | None = None
    autodetect: Property[bool] | None = None
    create_disposition: Property[JobInfo.CreateDisposition] | None = None
    ignore_unknown_values: Property[bool] | None = None
    max_bad_records: Property[int] | None = None
    schema: Property[dict[str, Any]] | None = None
    format: Format | None = None
    csv_options: CsvOptions | None = None
    avro_options: AvroOptions | None = None

    def schema(self, schema: dict[str, Any]) -> com.google.cloud.bigquery.Schema:
        raise NotImplementedError  # TODO: translate from Java

    def fields(self, fields: list[dict[str, Any]]) -> list[Field]:
        raise NotImplementedError  # TODO: translate from Java

    def outputs(self, run_context: RunContext, configuration: LoadConfiguration, job: Job) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def metrics(self, run_context: RunContext, stats: JobStatistics.LoadStatistics, job: Job) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        job_id: str | None = None
        destination_table: str | None = None
        rows: int | None = None

    class Format(str, Enum):
        CSV = "CSV"
        JSON = "JSON"
        AVRO = "AVRO"
        PARQUET = "PARQUET"
        ORC = "ORC"

    @dataclass(slots=True)
    class CsvOptions:
        allow_jagged_rows: Property[bool] | None = None
        allow_quoted_new_lines: Property[bool] | None = None
        encoding: Property[str] | None = None
        field_delimiter: Property[str] | None = None
        quote: Property[str] | None = None
        skip_leading_rows: Property[int] | None = None

        def to(self, run_context: RunContext) -> com.google.cloud.bigquery.CsvOptions:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class AvroOptions:
        use_avro_logical_types: Property[bool] | None = None
