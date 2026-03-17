from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.blob.abstracts.abstract_blob_storage import AbstractBlobStorage
from integrations.azure.storage.blob.abstracts.abstract_blob_storage_container_interface import AbstractBlobStorageContainerInterface
from integrations.azure.storage.blob.abstracts.abstract_blob_storage_object_interface import AbstractBlobStorageObjectInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractBlobStorageObject(AbstractBlobStorage, AbstractBlobStorageObjectInterface, AbstractBlobStorageContainerInterface):
    container: Property[str] | None = None
    name: Property[str] | None = None

    def blob_client(self, run_context: RunContext) -> BlobClient:
        raise NotImplementedError  # TODO: translate from Java
