from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlNamespaceFileMetadataRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_namespace_file_metadata_repository import AbstractJdbcNamespaceFileMetadataRepository
from engine.repository.mysql.mysql_repository import MysqlRepository
from engine.core.models.namespaces.files.namespace_file_metadata import NamespaceFileMetadata


@dataclass(slots=True, kw_only=True)
class MysqlNamespaceFileMetadataRepository(AbstractJdbcNamespaceFileMetadataRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
