from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\Download.java
# WARNING: Unresolved types: BlobId, Exception, IOException, core, io, kestra, models, tasks

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.gcp.gcs.abstract_gcs import AbstractGcs
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.storages.storage import Storage


@dataclass(slots=True, kw_only=True)
class Download(AbstractGcs):
    """Download a GCS object"""
    from: Property[str] | None = None

    @staticmethod
    def download(run_context: RunContext, connection: Storage, source: BlobId) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        bucket: str | None = None
        path: str | None = None
        uri: str | None = None
