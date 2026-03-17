from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.blob.abstracts.abstract_blob_storage_container_interface import AbstractBlobStorageContainerInterface
from integrations.azure.storage.blob.abstracts.abstract_blob_storage_with_sas import AbstractBlobStorageWithSas
from integrations.gcp.gcs.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractBlobStorageWithSas, RunnableTask, ListInterface, AbstractBlobStorageContainerInterface):
    """List blob objects in an Azure Blob Storage container."""
    container: Property[str] | None = None
    prefix: Property[str] | None = None
    regexp: Property[str] | None = None
    delimiter: Property[str] | None = None
    filter: Property[Filter] | None = None
    max_files: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        blobs: java | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    blobs: java | None = None
