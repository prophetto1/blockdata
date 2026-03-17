from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.gcp.bigquery.abstract_job import AbstractJob
from integrations.dbt.cloud.models.job import Job
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class OperationType(str, Enum):
    COPY = "COPY"
    SNAPSHOT = "SNAPSHOT"
    RESTORE = "RESTORE"
    CLONE = "CLONE"


@dataclass(slots=True, kw_only=True)
class Copy(AbstractJob, RunnableTask):
    """Copy or snapshot BigQuery tables"""
    source_tables: Property[list[String]]
    destination_table: Property[str]
    operation_type: Property[OperationType] | None = None

    def run(self, run_context: RunContext) -> Copy:
        raise NotImplementedError  # TODO: translate from Java

    def job_configuration(self, run_context: RunContext) -> CopyJobConfiguration:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self, stats: JobStatistics, query_job: Job) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def metrics(self, run_context: RunContext, stats: JobStatistics, query_job: Job) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        job_id: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    job_id: str | None = None
