from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.minio.abstract_minio_object import AbstractMinioObject
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateBucket(AbstractMinioObject, RunnableTask):
    """Create a MinIO bucket."""
    object_lock_enabled_for_bucket: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        bucket: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    bucket: str | None = None
