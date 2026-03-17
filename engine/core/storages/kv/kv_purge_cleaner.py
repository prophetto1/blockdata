from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\kv\KVPurgeCleaner.java

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.services.kv_store_service import KVStoreService
from engine.core.repositories.kv_metadata_repository_interface import KvMetadataRepositoryInterface


@dataclass(slots=True, kw_only=True)
class KVPurgeCleaner:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    kv_store_service: KVStoreService | None = None
    flow_repository: FlowRepositoryInterface | None = None
    kv_metadata_repository: KvMetadataRepositoryInterface | None = None
    batch_size: int | None = None

    def purge_expired(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def purge_kv_entries_for_tenant(self, tenant: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def find_namespaces(self, tenant: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def find_tenants(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java
