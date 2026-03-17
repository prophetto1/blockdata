from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.microsoft365.oneshare.abstract_one_share_task import AbstractOneShareTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class ExportFormat(str, Enum):
    PDF = "PDF"
    HTML = "HTML"


@dataclass(slots=True, kw_only=True)
class Export(AbstractOneShareTask, RunnableTask):
    """Export OneDrive/SharePoint file"""
    item_id: Property[str]
    format: Property[ExportFormat]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
