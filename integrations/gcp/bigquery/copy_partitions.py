from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.gcp.bigquery.abstract_job_interface import AbstractJobInterface
from integrations.gcp.bigquery.abstract_partition import AbstractPartition
from integrations.jenkins.job_info import JobInfo
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CopyPartitions(AbstractPartition, RunnableTask, AbstractJobInterface):
    """Copy BigQuery partitions to another table"""
    destination_table: Property[str] | None = None
    write_disposition: Property[JobInfo] | None = None
    create_disposition: Property[JobInfo] | None = None
    job_timeout: Property[timedelta] | None = None
    labels: Property[dict[String, String]] | None = None
    dry_run: Property[bool] | None = None
    skip_empty: Property[bool] | None = None

    def run(self, run_context: RunContext) -> CopyPartitions:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        project_id: str | None = None
        dataset_id: str | None = None
        table: str | None = None
        partitions: list[String] | None = None
        job_id: str | None = None

        def of(self, table: TableId, partitions: list[String], job_id: str) -> Output:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    project_id: str | None = None
    dataset_id: str | None = None
    table: str | None = None
    partitions: list[String] | None = None
    job_id: str | None = None

    def of(self, table: TableId, partitions: list[String], job_id: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java
