from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2KvMetadataRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_kv_metadata_repository import AbstractJdbcKvMetadataRepository
from engine.repository.h2.h2_repository import H2Repository
from engine.core.models.kv.persisted_kv_metadata import PersistedKvMetadata


@dataclass(slots=True, kw_only=True)
class H2KvMetadataRepository(AbstractJdbcKvMetadataRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
