from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\DeleteList.java
# WARNING: Unresolved types: Exception, Filter, Function, Logger, MinioClient, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.minio.abstract_minio_object import AbstractMinioObject
from integrations.minio.model.minio_object import MinioObject
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DeleteList(AbstractMinioObject):
    """Delete a list of keys on a MinIO bucket."""
    max_keys: Property[int] = Property.ofValue(1000)
    filter: Property[List.Filter] = Property.ofValue(List.Filter.BOTH)
    error_on_empty: Property[bool] = Property.ofValue(false)
    prefix: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    regexp: Property[str] | None = None
    concurrent: int | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def list(self, run_context: RunContext) -> java.util.List[MinioObject]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def delete(logger: Logger, client: MinioClient, bucket: str) -> Function[MinioObject, int]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int = 0
        size: int = 0
