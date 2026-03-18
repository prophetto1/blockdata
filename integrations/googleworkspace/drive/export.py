from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\drive\Export.java
# WARNING: Unresolved types: Exception, core, drive, googleworkspace, io, kestra, models, plugin, tasks

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.googleworkspace.drive.abstract_drive import AbstractDrive
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Export(AbstractDrive):
    """Export a Google Doc and download it"""
    file_id: Property[str]
    content_type: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        file: io.kestra.plugin.googleworkspace.drive.models.File | None = None
