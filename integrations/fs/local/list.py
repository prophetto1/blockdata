from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.fs.local.abstract_local_task import AbstractLocalTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractLocalTask, RunnableTask):
    """List local files"""
    from: Property[str]
    reg_exp: Property[str] | None = None
    recursive: Property[bool] | None = None
    max_files: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        files: java | None = None
        count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    files: java | None = None
    count: int | None = None
