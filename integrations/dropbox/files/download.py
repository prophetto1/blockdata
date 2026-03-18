from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dropbox\src\main\java\io\kestra\plugin\dropbox\files\Download.java
# WARNING: Unresolved types: DbxClientV2, Exception, FileMetadata, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class Download(Task):
    """Download Dropbox file to storage"""
    access_token: Property[str]
    from: Any

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def create_client(self, run_context: RunContext) -> DbxClientV2:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        metadata: FileMetadata | None = None
