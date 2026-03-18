from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\Copy.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.blob.abstracts.abstract_blob_storage_with_sas import AbstractBlobStorageWithSas
from integrations.azure.storage.blob.models.blob import Blob
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Copy(AbstractBlobStorageWithSas):
    """Copy a blob within Azure Storage"""
    from: CopyObject
    to: CopyObject
    delete: Property[bool] = Property.ofValue(false)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CopyObject:
        container: Property[str]
        name: Property[str]

    @dataclass(slots=True)
    class Output:
        blob: Blob | None = None
