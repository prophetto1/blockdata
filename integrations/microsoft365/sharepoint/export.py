from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.microsoft365.sharepoint.abstract_sharepoint_task import AbstractSharepointTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class FormatType(str, Enum):
    HTML = "HTML"
    PDF = "PDF"


@dataclass(slots=True, kw_only=True)
class Export(AbstractSharepointTask, RunnableTask):
    """Export SharePoint file to PDF or HTML"""
    item_id: Property[str] | None = None
    item_path: Property[str] | None = None
    format: Property[FormatType]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        item_id: str | None = None
        original_name: str | None = None
        name: str | None = None
        uri: str | None = None
        original_size: int | None = None
        web_url: str | None = None
        format: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    item_id: str | None = None
    original_name: str | None = None
    name: str | None = None
    uri: str | None = None
    original_size: int | None = None
    web_url: str | None = None
    format: str | None = None
