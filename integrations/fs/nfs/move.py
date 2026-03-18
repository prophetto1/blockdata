from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\nfs\Move.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.fs.nfs.nfs_service import NfsService
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class Move(Task):
    """Move or rename a file on NFS"""
    from: Property[str]
    to: Property[str]
    nfs_service: NfsService = NfsService.getInstance()

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        from: str | None = None
        to: str | None = None
