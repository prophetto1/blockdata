from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.microsoft365.sharepoint.abstract_sharepoint_task import AbstractSharepointTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Move(AbstractSharepointTask, RunnableTask):
    """Move SharePoint file or folder"""
    item_id: Property[str]
    destination_parent_id: Property[str]
    new_name: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        item_id: str | None = None
        item_name: str | None = None
        parent_id: str | None = None
        web_url: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    item_id: str | None = None
    item_name: str | None = None
    parent_id: str | None = None
    web_url: str | None = None
