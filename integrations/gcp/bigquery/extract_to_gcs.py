from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\ExtractToGcs.java
# WARNING: Unresolved types: Exception, ExtractJobConfiguration, ExtractStatistics, InterruptedException, JobStatistics, Logger, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.gcp.bigquery.abstract_bigquery import AbstractBigquery
from integrations.gcp.bigquery.big_query_exception import BigQueryException
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.airbyte.models.job import Job
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ExtractToGcs(AbstractBigquery):
    """Export BigQuery table to GCS"""
    source_table: Property[str] | None = None
    destination_uris: Property[list[str]] | None = None
    compression: Property[str] | None = None
    field_delimiter: Property[str] | None = None
    format: Property[str] | None = None
    use_avro_logical_types: Property[bool] | None = None
    job_timeout_ms: Property[int] | None = None
    labels: Property[dict[str, str]] | None = None
    print_header: Property[bool] | None = None

    def run(self, run_context: RunContext) -> ExtractToGcs.Output:
        raise NotImplementedError  # TODO: translate from Java

    def execute(self, run_context: RunContext, logger: Logger, configuration: ExtractJobConfiguration, job: Job) -> ExtractToGcs.Output:
        raise NotImplementedError  # TODO: translate from Java

    def metrics(self, run_context: RunContext, stats: JobStatistics.ExtractStatistics, job: Job) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def build_extract_job(self, run_context: RunContext) -> ExtractJobConfiguration:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        job_id: str | None = None
        source_table: str | None = None
        destination_uris: list[str] | None = None
        file_counts: list[int] | None = None
