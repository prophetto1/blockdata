from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from integrations.fs.local.abstract_local_task import AbstractLocalTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractLocalTask, RunnableTask):
    """Delete local file or directory"""
    from: Property[str]
    error_on_missing: Property[bool] | None = None
    recursive: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def delete_directory_recursively(self, dir: Path) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        deleted: bool | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    deleted: bool | None = None
