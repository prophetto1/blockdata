from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from integrations.microsoft365.sharepoint.abstract_sharepoint_task import AbstractSharepointTask
from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.microsoft365.sharepoint.models.item import Item
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractSharepointTask, RunnableTask):
    """List SharePoint drive items"""
    folder_id: Property[str]
    fetch_type: Property[FetchType]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def store_items(self, run_context: RunContext, items: java) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        items: java | None = None
        item: Item | None = None
        uri: str | None = None
        size: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    items: java | None = None
    item: Item | None = None
    uri: str | None = None
    size: int | None = None
