from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\Copy.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.minio.abstract_minio_object import AbstractMinioObject
from integrations.aws.s3.object_output import ObjectOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Copy(AbstractMinioObject):
    """Copy a file between MinIO buckets."""
    delete: Property[bool] = Property.ofValue(false)
    from: CopyObjectFrom | None = None
    to: CopyObject | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CopyObject:
        bucket: Property[str] | None = None
        key: Property[str] | None = None

    @dataclass(slots=True)
    class CopyObjectFrom(CopyObject):
        version_id: Property[str] | None = None

    @dataclass(slots=True)
    class Output(ObjectOutput):
        bucket: str | None = None
        key: str | None = None
