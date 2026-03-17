from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\UpdateTable.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.gcp.bigquery.abstract_table import AbstractTable
from integrations.gcp.bigquery.abstract_table_create_update import AbstractTableCreateUpdate
from integrations.aws.glue.model.output import Output
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class UpdateTable(AbstractTableCreateUpdate):
    """Update BigQuery table metadata"""

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
