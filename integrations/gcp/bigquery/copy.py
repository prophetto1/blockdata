from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\Copy.java
# WARNING: Unresolved types: CopyJobConfiguration, CopyStatistics, Exception, JobStatistics, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.gcp.bigquery.abstract_job import AbstractJob
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.airbyte.models.job import Job
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Copy(AbstractJob):
    """Copy or snapshot BigQuery tables"""
    source_tables: Property[list[str]]
    destination_table: Property[str]
    operation_type: Property[OperationType] | None = None

    def run(self, run_context: RunContext) -> Copy.Output:
        raise NotImplementedError  # TODO: translate from Java

    def job_configuration(self, run_context: RunContext) -> CopyJobConfiguration:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self, stats: JobStatistics.CopyStatistics, query_job: Job) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def metrics(self, run_context: RunContext, stats: JobStatistics.CopyStatistics, query_job: Job) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        job_id: str | None = None

    class OperationType(str, Enum):
        COPY = "COPY"
        SNAPSHOT = "SNAPSHOT"
        RESTORE = "RESTORE"
        CLONE = "CLONE"
