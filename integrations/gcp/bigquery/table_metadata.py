from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.gcp.bigquery.abstract_table import AbstractTable
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class IfNotExists(str, Enum):
    ERROR = "ERROR"
    SKIP = "SKIP"


@dataclass(slots=True, kw_only=True)
class TableMetadata(AbstractTable, RunnableTask):
    """Get BigQuery table metadata"""
    if_not_exists: Property[IfNotExists] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
