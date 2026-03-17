from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\CopyPartitions.java
# WARNING: Unresolved types: CreateDisposition, Exception, TableId, WriteDisposition, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.gcp.bigquery.abstract_job_interface import AbstractJobInterface
from integrations.gcp.bigquery.abstract_partition import AbstractPartition
from integrations.airbyte.models.job_info import JobInfo
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CopyPartitions(AbstractPartition):
    """Copy BigQuery partitions to another table"""
    dry_run: Property[bool] = Property.ofValue(false)
    skip_empty: Property[bool] = Property.ofValue(false)
    destination_table: Property[str] | None = None
    write_disposition: Property[JobInfo.WriteDisposition] | None = None
    create_disposition: Property[JobInfo.CreateDisposition] | None = None
    job_timeout: Property[timedelta] | None = None
    labels: Property[dict[str, str]] | None = None

    def run(self, run_context: RunContext) -> CopyPartitions.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        project_id: str | None = None
        dataset_id: str | None = None
        table: str | None = None
        partitions: list[str] | None = None
        job_id: str | None = None

        @staticmethod
        def of(table: TableId, partitions: list[str], job_id: str) -> Output:
            raise NotImplementedError  # TODO: translate from Java
