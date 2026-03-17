from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.fs.nfs.nfs_service import NfsService
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Delete(Task, RunnableTask):
    """Delete a file on NFS"""
    nfs_service: NfsService | None = None
    uri: Property[str]
    error_on_missing: bool = True

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None
        deleted: bool | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
    deleted: bool | None = None
