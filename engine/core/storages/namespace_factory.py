from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\NamespaceFactory.java
# WARNING: Unresolved types: Logger

from dataclasses import dataclass
from typing import Any

from engine.core.models.namespaces.namespace import Namespace
from engine.core.repositories.namespace_file_metadata_repository_interface import NamespaceFileMetadataRepositoryInterface
from engine.core.storages.storage_interface import StorageInterface


@dataclass(slots=True, kw_only=True)
class NamespaceFactory:
    namespace_file_metadata_repository_interface: NamespaceFileMetadataRepositoryInterface | None = None

    def of(self, tenant_id: str, namespace: str, storage_interface: StorageInterface) -> Namespace:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, logger: Logger, tenant_id: str, namespace: str, storage_interface: StorageInterface) -> Namespace:
        raise NotImplementedError  # TODO: translate from Java
