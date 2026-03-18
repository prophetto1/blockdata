from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresNamespaceFileMetadataRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_namespace_file_metadata_repository import AbstractJdbcNamespaceFileMetadataRepository
from engine.core.models.namespaces.files.namespace_file_metadata import NamespaceFileMetadata
from engine.repository.postgres.postgres_repository import PostgresRepository


@dataclass(slots=True, kw_only=True)
class PostgresNamespaceFileMetadataRepository(AbstractJdbcNamespaceFileMetadataRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
