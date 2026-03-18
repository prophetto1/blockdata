from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\table\Get.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.table.abstracts.abstract_table_storage import AbstractTableStorage
from integrations.azure.storage.table.models.entity import Entity
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractTableStorage):
    """Fetch one Table entity"""
    partition_key: Property[str]
    row_key: Property[str] | None = None

    def run(self, run_context: RunContext) -> Get.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        row: Entity | None = None
