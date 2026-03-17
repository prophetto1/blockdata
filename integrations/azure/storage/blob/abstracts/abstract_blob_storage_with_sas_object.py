from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\abstracts\AbstractBlobStorageWithSasObject.java
# WARNING: Unresolved types: BlobClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.blob.abstracts.abstract_blob_storage_container_interface import AbstractBlobStorageContainerInterface
from integrations.azure.storage.blob.abstracts.abstract_blob_storage_object_interface import AbstractBlobStorageObjectInterface
from integrations.azure.storage.blob.abstracts.abstract_blob_storage_with_sas import AbstractBlobStorageWithSas
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractBlobStorageWithSasObject(ABC, AbstractBlobStorageWithSas):
    container: Property[str] | None = None
    name: Property[str] | None = None

    def blob_client(self, run_context: RunContext) -> BlobClient:
        raise NotImplementedError  # TODO: translate from Java
