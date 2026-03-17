from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2NamespaceFileMetadataRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_namespace_file_metadata_repository import AbstractJdbcNamespaceFileMetadataRepository
from engine.core.models.conditions.condition import Condition
from engine.repository.h2.h2_repository import H2Repository
from engine.core.models.namespaces.files.namespace_file_metadata import NamespaceFileMetadata


@dataclass(slots=True, kw_only=True)
class H2NamespaceFileMetadataRepository(AbstractJdbcNamespaceFileMetadataRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
