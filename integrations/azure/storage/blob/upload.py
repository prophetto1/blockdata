from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\Upload.java
# WARNING: Unresolved types: Exception, From, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.blob.abstracts.abstract_blob_storage_with_sas_object import AbstractBlobStorageWithSasObject
from integrations.azure.storage.blob.models.access_tier import AccessTier
from integrations.azure.storage.blob.models.blob import Blob
from integrations.azure.storage.blob.models.blob_immutability_policy import BlobImmutabilityPolicy
from integrations.datagen.data import Data
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Upload(AbstractBlobStorageWithSasObject):
    """Upload file(s) to Azure Blob Storage"""
    from: Any
    metadata: Property[dict[str, str]] | None = None
    tags: Property[dict[str, str]] | None = None
    access_tier: Property[AccessTier] | None = None
    legal_hold: Property[bool] | None = None
    immutability_policy: BlobImmutabilityPolicy | None = None

    def run(self, run_context: RunContext) -> Upload.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        blob: Blob | None = None
        blobs: list[Blob] | None = None
