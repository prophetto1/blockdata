from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\vfs\Downloads.java
# WARNING: Unresolved types: Exception, core, fs, io, java, kestra, models, plugin, tasks, util, vfs

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any

from integrations.fs.vfs.abstract_vfs_task import AbstractVfsTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Downloads(ABC, AbstractVfsTask):
    from: Property[str]
    recursive: Property[bool] = Property.ofValue(false)
    max_files: Property[int] = Property.ofValue(25)
    action: Property[Downloads.Action] | None = None
    move_directory: Property[str] | None = None
    reg_exp: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    class Action(str, Enum):
        MOVE = "MOVE"
        DELETE = "DELETE"
        NONE = "NONE"

    @dataclass(slots=True)
    class Output:
        files: java.util.List[io.kestra.plugin.fs.vfs.models.File] | None = None
        output_files: dict[str, str] | None = None
