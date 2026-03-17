from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\KvMetadataRepositoryInterface.java
# WARNING: Unresolved types: IOException, Pageable

from typing import Any, Protocol

from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.fetch_version import FetchVersion
from engine.core.models.kv.persisted_kv_metadata import PersistedKvMetadata
from engine.core.models.query_filter import QueryFilter
from engine.core.repositories.save_repository_interface import SaveRepositoryInterface


class KvMetadataRepositoryInterface(Protocol):
    def find_by_name(self, tenant_id: str, namespace: str, name: str) -> Optional[PersistedKvMetadata]: ...

    def find(self, pageable: Pageable, tenant_id: str, filters: list[QueryFilter], allow_deleted: bool, allow_expired: bool) -> ArrayListTotal[PersistedKvMetadata]: ...

    def find(self, pageable: Pageable, tenant_id: str, filters: list[QueryFilter], allow_deleted: bool, allow_expired: bool, fetch_behavior: FetchVersion) -> ArrayListTotal[PersistedKvMetadata]: ...

    def delete(self, persisted_kv_metadata: PersistedKvMetadata) -> PersistedKvMetadata: ...

    def purge(self, persisted_kvs_metadata: list[PersistedKvMetadata]) -> int: ...
