from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.minio.abstract_minio_object import AbstractMinioObject
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Download(AbstractMinioObject, RunnableTask):
    """Download a file from a MinIO bucket."""
    key: Property[str] | None = None
    version_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None
        content_length: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
    content_length: int | None = None
