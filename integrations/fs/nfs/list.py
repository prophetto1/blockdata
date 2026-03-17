from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from pathlib import Path

from integrations.fs.nfs.nfs_service import NfsService
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class List(Task, RunnableTask):
    """List files on an NFS mount"""
    nfs_service: NfsService | None = None
    from: Property[str]
    reg_exp: Property[str] | None = None
    recursive: Property[bool] | None = None
    max_files: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def map_to_file(self, path: Path) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        files: java | None = None

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


@dataclass(slots=True, kw_only=True)
class Output(io):
    files: java | None = None


@dataclass(slots=True, kw_only=True)
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
