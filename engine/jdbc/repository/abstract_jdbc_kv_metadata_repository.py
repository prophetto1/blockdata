from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcKvMetadataRepository.java
# WARNING: Unresolved types: Pageable, io, jdbc, kestra

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_crud_repository import AbstractJdbcCrudRepository
from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.conditions.condition import Condition
from engine.core.models.fetch_version import FetchVersion
from engine.core.repositories.kv_metadata_repository_interface import KvMetadataRepositoryInterface
from engine.core.models.kv.persisted_kv_metadata import PersistedKvMetadata
from engine.core.models.query_filter import QueryFilter


@dataclass(slots=True, kw_only=True)
class AbstractJdbcKvMetadataRepository(AbstractJdbcCrudRepository):

    @staticmethod
    def last_condition(is_last: bool) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def last_condition() -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_query_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_name(self, tenant_id: str, namespace: str, name: str) -> Optional[PersistedKvMetadata]:
        raise NotImplementedError  # TODO: translate from Java

    def find_select(self, filters: list[QueryFilter], allow_expired: bool, fetch_behavior: FetchVersion) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, pageable: Pageable, tenant_id: str, filters: list[QueryFilter], allow_deleted: bool, allow_expired: bool, fetch_behavior: FetchVersion) -> ArrayListTotal[PersistedKvMetadata]:
        raise NotImplementedError  # TODO: translate from Java

    def purge(self, persisted_kvs_metadata: list[PersistedKvMetadata]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, kv_metadata: PersistedKvMetadata) -> PersistedKvMetadata:
        raise NotImplementedError  # TODO: translate from Java
