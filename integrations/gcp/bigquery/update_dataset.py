from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\UpdateDataset.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.gcp.bigquery.abstract_dataset import AbstractDataset
from integrations.aws.glue.model.output import Output
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class UpdateDataset(AbstractDataset):
    """Update BigQuery dataset metadata"""

    def run(self, run_context: RunContext) -> AbstractDataset.Output:
        raise NotImplementedError  # TODO: translate from Java
