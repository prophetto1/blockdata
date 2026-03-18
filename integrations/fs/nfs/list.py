from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\nfs\List.java
# WARNING: Unresolved types: Exception, IOException, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from pathlib import Path
from datetime import datetime
from typing import Any

from integrations.fs.nfs.nfs_service import NfsService
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class List(Task):
    """List files on an NFS mount"""
    from: Property[str]
    nfs_service: NfsService = NfsService.getInstance()
    recursive: Property[bool] = Property.ofValue(false)
    max_files: Property[int] = Property.ofValue(25)
    reg_exp: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def map_to_file(self, path: Path) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        files: java.util.List[Path] | None = None

    @dataclass(slots=True)
    class File:
        name: str | None = None
        uri: str | None = None
        local_path: Path | None = None
        is_directory: bool | None = None
        is_symbolic_link: bool | None = None
        is_hidden: bool | None = None
        size: int | None = None
        creation_time: datetime | None = None
        last_access_time: datetime | None = None
        last_modified_time: datetime | None = None
