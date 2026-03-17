from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlNamespaceFileMetadataRepositoryService.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.models.conditions.condition import Condition
from engine.core.models.namespaces.files.namespace_file_metadata import NamespaceFileMetadata


@dataclass(slots=True, kw_only=True)
class MysqlNamespaceFileMetadataRepositoryService:

    @staticmethod
    def find_condition(jdbc_repository: AbstractJdbcRepository[NamespaceFileMetadata], query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
