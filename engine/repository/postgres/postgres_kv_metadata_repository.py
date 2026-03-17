from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresKvMetadataRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_kv_metadata_repository import AbstractJdbcKvMetadataRepository
from engine.core.models.kv.persisted_kv_metadata import PersistedKvMetadata
from engine.repository.postgres.postgres_repository import PostgresRepository


@dataclass(slots=True, kw_only=True)
class PostgresKvMetadataRepository(AbstractJdbcKvMetadataRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
