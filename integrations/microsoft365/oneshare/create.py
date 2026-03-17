from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\oneshare\Create.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.microsoft365.oneshare.abstract_one_share_task import AbstractOneShareTask
from integrations.microsoft365.oneshare.models.item_type import ItemType
from integrations.microsoft365.oneshare.models.one_share_file import OneShareFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractOneShareTask):
    """Create OneDrive/SharePoint file or folder"""
    name: Property[str]
    item_type: Property[ItemType] = Property.ofValue(ItemType.FILE)
    parent_id: Property[str] | None = None
    content: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        file: OneShareFile | None = None
