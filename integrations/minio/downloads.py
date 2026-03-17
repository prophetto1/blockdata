from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\Downloads.java
# WARNING: Unresolved types: CopyObject, Exception, Filter, core, io, java, kestra, minio, models, plugin, tasks, util

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.minio.abstract_minio_object import AbstractMinioObject
from integrations.aws.s3.copy import Copy
from integrations.minio.model.minio_object import MinioObject
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Downloads(AbstractMinioObject):
    """Downloads multiple files from a MinIO bucket."""
    action: Property[Action]
    max_keys: Property[int] = Property.ofValue(1000)
    filter: Property[io.kestra.plugin.minio.List.Filter] = Property.ofValue(io.kestra.plugin.minio.List.Filter.BOTH)
    prefix: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    regexp: Property[str] | None = None
    move_to: Copy.CopyObject | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    class Action(str, Enum):
        MOVE = "MOVE"
        DELETE = "DELETE"
        NONE = "NONE"

    @dataclass(slots=True)
    class Output:
        objects: java.util.List[MinioObject] | None = None
        output_files: dict[str, str] | None = None
