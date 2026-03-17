from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\table\List.java
# WARNING: Unresolved types: Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.table.abstracts.abstract_table_storage import AbstractTableStorage
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractTableStorage):
    """List Azure Table entities"""
    max_files: Property[int] = Property.ofValue(25)
    filter: Property[str] | None = None
    select: Property[java.util.List[str]] | None = None
    top: Property[int] | None = None

    def run(self, run_context: RunContext) -> List.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int | None = None
        uri: str | None = None
