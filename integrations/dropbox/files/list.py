from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dropbox\src\main\java\io\kestra\plugin\dropbox\files\List.java
# WARNING: Unresolved types: DbxClientV2, Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.dropbox.models.dropbox_file import DropboxFile
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class List(Task):
    """List Dropbox directory entries"""
    access_token: Property[str]
    recursive: Property[bool] = Property.ofValue(false)
    limit: Property[int] = Property.ofValue(2000)
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.FETCH)
    from: Any | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def create_client(self, run_context: RunContext) -> DbxClientV2:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        rows: java.util.List[DropboxFile] | None = None
        row: DropboxFile | None = None
        uri: str | None = None
        size: int | None = None
