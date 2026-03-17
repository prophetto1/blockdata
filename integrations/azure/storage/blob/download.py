from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.blob.abstracts.abstract_blob_storage_with_sas_object import AbstractBlobStorageWithSasObject
from integrations.gcp.gcs.models.blob import Blob
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Download(AbstractBlobStorageWithSasObject, RunnableTask):
    """Download a blob to Kestra storage"""

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        blob: Blob | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    blob: Blob | None = None
