from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.fs.nfs.nfs_service import NfsService
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class CheckMount(Task, RunnableTask):
    """Validate an NFS mount path"""
    nfs_service: NfsService | None = None
    path: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        path: str | None = None
        is_nfs_mount: bool | None = None
        file_store_type: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    path: str | None = None
    is_nfs_mount: bool | None = None
    file_store_type: str | None = None
