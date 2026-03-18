from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\Download.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.minio.abstract_minio_object import AbstractMinioObject
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Download(AbstractMinioObject):
    """Download a file from a MinIO bucket."""
    key: Property[str] | None = None
    version_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        content_length: int | None = None
