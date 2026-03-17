from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.table.abstracts.abstract_table_storage import AbstractTableStorage
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Delete(AbstractTableStorage, RunnableTask):
    """Delete one Table entity"""
    partition_key: Property[str]
    row_key: Property[str]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
