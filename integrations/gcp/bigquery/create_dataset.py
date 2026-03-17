from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.gcp.bigquery.abstract_dataset import AbstractDataset
from integrations.singer.taps.big_query import BigQuery
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class IfExists(str, Enum):
    ERROR = "ERROR"
    UPDATE = "UPDATE"
    SKIP = "SKIP"


@dataclass(slots=True, kw_only=True)
class CreateDataset(AbstractDataset, RunnableTask):
    """Create or update a BigQuery dataset"""
    if_exists: Property[IfExists] | None = None

    def run(self, run_context: RunContext) -> AbstractDataset:
        raise NotImplementedError  # TODO: translate from Java

    def create(self, connection: BigQuery, run_context: RunContext, dataset_info: DatasetInfo) -> Dataset:
        raise NotImplementedError  # TODO: translate from Java
