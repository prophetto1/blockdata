from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\oneshare\List.java
# WARNING: Unresolved types: DriveItemCollectionResponse, Exception, GraphServiceClient, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.microsoft365.oneshare.abstract_one_share_task import AbstractOneShareTask
from integrations.microsoft365.oneshare.models.one_share_file import OneShareFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractOneShareTask):
    """List OneDrive/SharePoint folder items"""
    item_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_next_page(self, client: GraphServiceClient, next_link: str) -> DriveItemCollectionResponse:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        files: java.util.List[OneShareFile] | None = None
        count: int | None = None
