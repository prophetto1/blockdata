from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\local\Downloads.java
# WARNING: Unresolved types: Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any

from integrations.fs.local.abstract_local_task import AbstractLocalTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Downloads(AbstractLocalTask):
    """Download multiple local files"""
    from: Property[str]
    action: Property[Downloads.Action] = Property.ofValue(Downloads.Action.NONE)
    recursive: Property[bool] = Property.ofValue(false)
    max_files: Property[int] = Property.ofValue(25)
    move_directory: Property[str] | None = None
    reg_exp: Property[str] | None = None

    @staticmethod
    def perform_action(files: java.util.List[Path], action: Action, move_directory: Property[str], run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    class Action(str, Enum):
        MOVE = "MOVE"
        DELETE = "DELETE"
        NONE = "NONE"

    @dataclass(slots=True)
    class Output:
        files: list[Path] | None = None
        output_files: dict[str, str] | None = None
