from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.microsoft365.sharepoint.abstract_sharepoint_task import AbstractSharepointTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractSharepointTask, RunnableTask):
    """Delete SharePoint file or folder"""
    item_id: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        item_id: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    item_id: str | None = None
