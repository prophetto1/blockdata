from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcNamespaceFileMetadataRepository.java
# WARNING: Unresolved types: DSLContext, Pageable, Record1, SelectConditionStep, io, jdbc, kestra

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.conditions.condition import Condition
from engine.core.models.fetch_version import FetchVersion
from engine.core.models.namespaces.files.namespace_file_metadata import NamespaceFileMetadata
from engine.core.repositories.namespace_file_metadata_repository_interface import NamespaceFileMetadataRepositoryInterface
from engine.core.models.query_filter import QueryFilter


@dataclass(slots=True, kw_only=True)
class AbstractJdbcNamespaceFileMetadataRepository(ABC, AbstractJdbcRepository):
    jdbc_repository: io.kestra.jdbc.AbstractJdbcRepository[NamespaceFileMetadata] | None = None

    @staticmethod
    def last_condition(is_last: bool) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def last_condition() -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def find_condition(self, query: str) -> Condition:
        ...

    def find_query_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_path(self, tenant_id: str, namespace: str, path: str) -> Optional[NamespaceFileMetadata]:
        raise NotImplementedError  # TODO: translate from Java

    def find_select(self, context: DSLContext, tenant_id: str, filters: list[QueryFilter], allow_deleted: bool, fetch_behavior: FetchVersion) -> SelectConditionStep[Record1[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, pageable: Pageable, tenant_id: str, filters: list[QueryFilter], allow_deleted: bool, fetch_behavior: FetchVersion) -> ArrayListTotal[NamespaceFileMetadata]:
        raise NotImplementedError  # TODO: translate from Java

    def purge(self, namespace_files_metadata: list[NamespaceFileMetadata]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def path_condition(path: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, namespace_file_metadata: NamespaceFileMetadata) -> NamespaceFileMetadata:
        raise NotImplementedError  # TODO: translate from Java
