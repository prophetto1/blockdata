from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\TableMetadata.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.gcp.bigquery.abstract_table import AbstractTable
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class TableMetadata(AbstractTable):
    """Get BigQuery table metadata"""
    if_not_exists: Property[IfNotExists] = Property.ofValue(IfNotExists.ERROR)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    class IfNotExists(str, Enum):
        ERROR = "ERROR"
        SKIP = "SKIP"
