from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.bigquery.abstract_dataset import AbstractDataset
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class UpdateDataset(AbstractDataset, RunnableTask):
    """Update BigQuery dataset metadata"""

    def run(self, run_context: RunContext) -> AbstractDataset:
        raise NotImplementedError  # TODO: translate from Java
