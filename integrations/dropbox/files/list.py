from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.dropbox.models.dropbox_file import DropboxFile
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class List(Task, RunnableTask):
    """List Dropbox directory entries"""
    access_token: Property[str]
    from: Any | None = None
    recursive: Property[bool] | None = None
    limit: Property[int] | None = None
    fetch_type: Property[FetchType] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def create_client(self, run_context: RunContext) -> DbxClientV2:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        rows: java | None = None
        row: DropboxFile | None = None
        uri: str | None = None
        size: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    rows: java | None = None
    row: DropboxFile | None = None
    uri: str | None = None
    size: int | None = None
