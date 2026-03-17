from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from integrations.gcp.gcs.abstract_gcs import AbstractGcs
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.storages.storage import Storage


@dataclass(slots=True, kw_only=True)
class Download(AbstractGcs, RunnableTask):
    """Download a GCS object"""
    from: Property[str] | None = None

    def download(self, run_context: RunContext, connection: Storage, source: BlobId) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        bucket: str | None = None
        path: str | None = None
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    bucket: str | None = None
    path: str | None = None
    uri: str | None = None
