from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\DeletePartitions.java
# WARNING: Unresolved types: Exception, TableId, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.gcp.bigquery.abstract_partition import AbstractPartition
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DeletePartitions(AbstractPartition):
    """Delete BigQuery partitions in a range"""

    def run(self, run_context: RunContext) -> DeletePartitions.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        project_id: str | None = None
        dataset_id: str | None = None
        table: str | None = None
        partitions: list[str] | None = None

        @staticmethod
        def of(table: TableId, partitions: list[str]) -> Output:
            raise NotImplementedError  # TODO: translate from Java
