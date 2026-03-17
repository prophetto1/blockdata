from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.bigquery.abstract_partition import AbstractPartition
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DeletePartitions(AbstractPartition, RunnableTask):
    """Delete BigQuery partitions in a range"""

    def run(self, run_context: RunContext) -> DeletePartitions:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        project_id: str | None = None
        dataset_id: str | None = None
        table: str | None = None
        partitions: list[String] | None = None

        def of(self, table: TableId, partitions: list[String]) -> Output:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    project_id: str | None = None
    dataset_id: str | None = None
    table: str | None = None
    partitions: list[String] | None = None

    def of(self, table: TableId, partitions: list[String]) -> Output:
        raise NotImplementedError  # TODO: translate from Java
