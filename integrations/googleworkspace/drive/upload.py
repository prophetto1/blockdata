from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\drive\Upload.java
# WARNING: Unresolved types: Exception, core, drive, googleworkspace, io, kestra, models, plugin, tasks

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.googleworkspace.drive.abstract_create import AbstractCreate
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Upload(AbstractCreate):
    """Upload a file to Drive"""
    from: Property[str]
    content_type: Property[str]
    file_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        file: io.kestra.plugin.googleworkspace.drive.models.File | None = None
