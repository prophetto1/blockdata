from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.minio.abstract_minio_object import AbstractMinioObject
from integrations.minio.model.minio_object import MinioObject
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DeleteList(AbstractMinioObject, RunnableTask):
    """Delete a list of keys on a MinIO bucket."""
    prefix: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    max_keys: Property[int] | None = None
    regexp: Property[str] | None = None
    filter: Property[list] | None = None
    concurrent: int | None = None
    error_on_empty: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def list(self, run_context: RunContext) -> java:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, logger: Logger, client: MinioClient, bucket: str) -> Function[MinioObject, Long]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        count: int = 0
        size: int = 0


@dataclass(slots=True, kw_only=True)
class Output(io):
    count: int = 0
    size: int = 0
