from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\sharepoint\List.java
# WARNING: Unresolved types: Exception, IOException, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.microsoft365.sharepoint.abstract_sharepoint_task import AbstractSharepointTask
from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.microsoft365.sharepoint.models.item import Item
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractSharepointTask):
    """List SharePoint drive items"""
    folder_id: Property[str] = Property.ofValue("root")
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.FETCH)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def store_items(self, run_context: RunContext, items: java.util.List[Item]) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        items: java.util.List[Item] | None = None
        item: Item | None = None
        uri: str | None = None
        size: int | None = None
