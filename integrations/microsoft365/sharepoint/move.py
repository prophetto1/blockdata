from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\sharepoint\Move.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.microsoft365.sharepoint.abstract_sharepoint_task import AbstractSharepointTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Move(AbstractSharepointTask):
    """Move SharePoint file or folder"""
    item_id: Property[str]
    destination_parent_id: Property[str]
    new_name: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        item_id: str | None = None
        item_name: str | None = None
        parent_id: str | None = None
        web_url: str | None = None
