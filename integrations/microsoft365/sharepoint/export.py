from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\sharepoint\Export.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.microsoft365.sharepoint.abstract_sharepoint_task import AbstractSharepointTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Export(AbstractSharepointTask):
    """Export SharePoint file to PDF or HTML"""
    format: Property[FormatType]
    item_id: Property[str] | None = None
    item_path: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    class FormatType(str, Enum):
        HTML = "HTML"
        PDF = "PDF"

    @dataclass(slots=True)
    class Output:
        item_id: str | None = None
        original_name: str | None = None
        name: str | None = None
        uri: str | None = None
        original_size: int | None = None
        web_url: str | None = None
        format: str | None = None
