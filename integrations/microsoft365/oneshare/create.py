from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.microsoft365.oneshare.abstract_one_share_task import AbstractOneShareTask
from integrations.microsoft365.oneshare.models.item_type import ItemType
from integrations.microsoft365.oneshare.models.one_share_file import OneShareFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractOneShareTask, RunnableTask):
    """Create OneDrive/SharePoint file or folder"""
    parent_id: Property[str] | None = None
    name: Property[str]
    item_type: Property[ItemType] | None = None
    content: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        file: OneShareFile | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    file: OneShareFile | None = None
