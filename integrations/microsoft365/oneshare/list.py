from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.microsoft365.oneshare.abstract_one_share_task import AbstractOneShareTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractOneShareTask, RunnableTask):
    """List OneDrive/SharePoint folder items"""
    item_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_next_page(self, client: GraphServiceClient, next_link: str) -> DriveItemCollectionResponse:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        files: java | None = None
        count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    files: java | None = None
    count: int | None = None
