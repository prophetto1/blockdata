from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dropbox\src\main\java\io\kestra\plugin\dropbox\files\CreateFolder.java
# WARNING: Unresolved types: DbxClientV2, Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.dropbox.models.dropbox_file import DropboxFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class CreateFolder(Task):
    """Create folder in Dropbox"""
    access_token: Property[str]
    path: Any
    autorename: Property[bool] = Property.ofValue(false)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def render_path(self, run_context: RunContext, path_source: Any, field_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def create_client(self, run_context: RunContext) -> DbxClientV2:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        file: DropboxFile | None = None
