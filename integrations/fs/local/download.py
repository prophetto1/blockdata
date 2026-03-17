from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.fs.local.abstract_local_task import AbstractLocalTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Download(AbstractLocalTask, RunnableTask):
    """Download local file to internal storage"""
    from: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None
        size: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
    size: int | None = None
