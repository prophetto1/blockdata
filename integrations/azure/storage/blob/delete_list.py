from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.blob.abstracts.abstract_blob_storage_container_interface import AbstractBlobStorageContainerInterface
from integrations.azure.storage.blob.abstracts.abstract_blob_storage_with_sas import AbstractBlobStorageWithSas
from integrations.gcp.gcs.models.blob import Blob
from integrations.gcp.gcs.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DeleteList(AbstractBlobStorageWithSas, RunnableTask, ListInterface, AbstractBlobStorageContainerInterface):
    """Delete a list of objects from Azure Blob Storage."""
    container: Property[str] | None = None
    prefix: Property[str] | None = None
    regexp: Property[str] | None = None
    delimiter: Property[str] | None = None
    filter: Property[Filter] | None = None
    concurrent: int | None = None
    error_on_empty: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, logger: Logger, container_client: BlobContainerClient) -> Function[Blob, Long]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        count: int = 0
        size: int = 0


@dataclass(slots=True, kw_only=True)
class Output(io):
    count: int = 0
    size: int = 0
