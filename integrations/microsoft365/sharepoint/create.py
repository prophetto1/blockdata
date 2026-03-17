from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\sharepoint\Create.java
# WARNING: Unresolved types: DriveItem, Exception, GraphServiceClient, Logger, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.microsoft365.sharepoint.abstract_sharepoint_task import AbstractSharepointTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractSharepointTask):
    """Create SharePoint file or folder"""
    parent_id: Property[str]
    name: Property[str]
    item_type: Property[ItemType] = Property.ofValue(ItemType.FILE)
    content: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def create_folder(self, client: GraphServiceClient, drive_id: str, parent_id: str, folder_name: str, logger: Logger) -> DriveItem:
        raise NotImplementedError  # TODO: translate from Java

    def create_file(self, client: GraphServiceClient, drive_id: str, parent_id: str, file_name: str, content: str, logger: Logger) -> DriveItem:
        raise NotImplementedError  # TODO: translate from Java

    class ItemType(str, Enum):
        FILE = "FILE"
        FOLDER = "FOLDER"

    @dataclass(slots=True)
    class Output:
        item_id: str | None = None
        item_name: str | None = None
        web_url: str | None = None
