from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\kv\InternalKVStore.java
# WARNING: Unresolved types: IOException, Pageable, Pattern

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar, Optional

from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.fetch_version import FetchVersion
from engine.core.storages.kv.kv_entry import KVEntry
from engine.core.storages.kv.kv_store import KVStore
from engine.core.storages.kv.kv_value import KVValue
from engine.core.storages.kv.kv_value_and_metadata import KVValueAndMetadata
from engine.core.repositories.kv_metadata_repository_interface import KvMetadataRepositoryInterface
from engine.core.models.query_filter import QueryFilter
from engine.core.exceptions.resource_expired_exception import ResourceExpiredException
from engine.core.storages.storage_interface import StorageInterface


@dataclass(slots=True, kw_only=True)
class InternalKVStore:
    duration_pattern: ClassVar[Pattern]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    namespace: str | None = None
    tenant: str | None = None
    storage: StorageInterface | None = None
    kv_metadata_repository: KvMetadataRepositoryInterface | None = None

    def namespace(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def put(self, key: str, value: KVValueAndMetadata, overwrite: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_value(self, key: str) -> Optional[KVValue]:
        raise NotImplementedError  # TODO: translate from Java

    def get_raw_value(self, key: str) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, key: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def list_all(self) -> list[KVEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def list(self, pageable: Pageable, filters: list[QueryFilter], allow_deleted: bool, allow_expired: bool, fetch_behavior: FetchVersion) -> ArrayListTotal[KVEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def get(self, key: str) -> Optional[KVEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def purge(self, kv_entries: list[KVEntry]) -> int:
        raise NotImplementedError  # TODO: translate from Java
