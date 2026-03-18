from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\oneshare\Export.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.microsoft365.oneshare.abstract_one_share_task import AbstractOneShareTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Export(AbstractOneShareTask):
    """Export OneDrive/SharePoint file"""
    item_id: Property[str]
    format: Property[ExportFormat]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    class ExportFormat(str, Enum):
        PDF = "PDF"
        HTML = "HTML"

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
