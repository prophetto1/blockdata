from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.bigquery.abstract_table import AbstractTable
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DeleteTable(AbstractTable, RunnableTask):
    """Delete a BigQuery table or partition"""

    def run(self, run_context: RunContext) -> DeleteTable:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        project_id: str | None = None
        dataset_id: str | None = None
        table: str | None = None

        def of(self, table: TableId) -> Output:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    project_id: str | None = None
    dataset_id: str | None = None
    table: str | None = None

    def of(self, table: TableId) -> Output:
        raise NotImplementedError  # TODO: translate from Java
