from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.fs.vfs.abstract_vfs_task import AbstractVfsTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class Action(str, Enum):
    MOVE = "MOVE"
    DELETE = "DELETE"
    NONE = "NONE"


@dataclass(slots=True, kw_only=True)
class Downloads(AbstractVfsTask, RunnableTask):
    from: Property[str]
    action: Property[Downloads] | None = None
    move_directory: Property[str] | None = None
    reg_exp: Property[str] | None = None
    recursive: Property[bool] | None = None
    max_files: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        files: java | None = None
        output_files: dict[String, URI] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    files: java | None = None
    output_files: dict[String, URI] | None = None
