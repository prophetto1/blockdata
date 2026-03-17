from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\List.java
# WARNING: Unresolved types: Exception, Filter, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.blob.abstracts.abstract_blob_storage_container_interface import AbstractBlobStorageContainerInterface
from integrations.azure.storage.blob.abstracts.abstract_blob_storage_with_sas import AbstractBlobStorageWithSas
from integrations.azure.storage.blob.models.blob import Blob
from integrations.aws.s3.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractBlobStorageWithSas):
    """List blob objects in an Azure Blob Storage container."""
    filter: Property[Filter] = Property.ofValue(Filter.FILES)
    max_files: Property[int] = Property.ofValue(25)
    container: Property[str] | None = None
    prefix: Property[str] | None = None
    regexp: Property[str] | None = None
    delimiter: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        blobs: java.util.List[Blob] | None = None
