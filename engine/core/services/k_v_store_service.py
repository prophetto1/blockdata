from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\KVStoreService.java

from dataclasses import dataclass
from typing import Any

from engine.core.storages.kv.k_v_store import KVStore
from engine.core.repositories.kv_metadata_repository_interface import KvMetadataRepositoryInterface
from engine.core.services.namespace_service import NamespaceService
from engine.core.storages.storage_interface import StorageInterface


@dataclass(slots=True, kw_only=True)
class KVStoreService:
    kv_metadata_repository: KvMetadataRepositoryInterface | None = None
    storage_interface: StorageInterface | None = None
    namespace_service: NamespaceService | None = None

    def get(self, tenant: str, namespace: str, from_namespace: str) -> KVStore:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_not_parent_namespace(parent_namespace: str, child_namespace: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java
