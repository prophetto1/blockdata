from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\drive\Create.java
# WARNING: Unresolved types: Exception, core, drive, googleworkspace, io, kestra, models, plugin, tasks

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.googleworkspace.drive.abstract_create import AbstractCreate
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractCreate):
    """Create a file or folder in Drive"""

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        file: io.kestra.plugin.googleworkspace.drive.models.File | None = None
