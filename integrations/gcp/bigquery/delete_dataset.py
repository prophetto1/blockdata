from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.bigquery.abstract_bigquery import AbstractBigquery
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DeleteDataset(AbstractBigquery, RunnableTask):
    """Delete a BigQuery dataset"""
    name: Property[str]
    delete_contents: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        dataset: str


@dataclass(slots=True, kw_only=True)
class Output(io):
    dataset: str
