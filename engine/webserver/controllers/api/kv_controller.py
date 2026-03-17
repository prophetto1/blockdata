from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\KVController.java
# WARNING: Unresolved types: HttpHeaders, IOException

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.http.http_response import HttpResponse
from engine.core.storages.kv.kv_entry import KVEntry
from engine.core.storages.kv.kv_store import KVStore
from engine.core.models.kv.kv_type import KVType
from engine.core.repositories.kv_metadata_repository_interface import KvMetadataRepositoryInterface
from engine.webserver.responses.paged_results import PagedResults
from engine.core.models.query_filter import QueryFilter
from engine.core.exceptions.resource_expired_exception import ResourceExpiredException
from engine.core.storages.storage_interface import StorageInterface
from engine.core.tenant.tenant_service import TenantService


@dataclass(slots=True, kw_only=True)
class KVController:
    kv_metadata_repository: KvMetadataRepositoryInterface | None = None
    storage_interface: StorageInterface | None = None
    tenant_service: TenantService | None = None

    def sort_mapper(self, key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def list_all_keys(self, page: int, size: int, sort: list[str], filters: list[QueryFilter]) -> PagedResults[KVEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def list_keys(self, namespace: str) -> list[KVEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def list_keys_with_inheritence(self, namespace: str) -> list[KVEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def get_kv_entries_with_inheritance(self, namespaces: list[str]) -> list[KVEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def get_key_value(self, namespace: str, key: str) -> KvDetail:
        raise NotImplementedError  # TODO: translate from Java

    def delete_key_value(self, namespace: str, key: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def delete_key_values(self, namespace: str, request: ApiDeleteBulkRequest) -> HttpResponse[ApiDeleteBulkResponse]:
        raise NotImplementedError  # TODO: translate from Java

    def global_kv_store(self) -> KVStore:
        raise NotImplementedError  # TODO: translate from Java

    def kv_store(self, namespace: str) -> KVStore:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ApiDeleteBulkResponse:
        keys: list[str] | None = None

        def keys(self) -> list[str]:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ApiDeleteBulkRequest:
        keys: list[str] | None = None

        def keys(self) -> list[str]:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class KvDetail:
        type: KVType | None = None
        value: Any | None = None
        revision: int | None = None
        updated: datetime | None = None
