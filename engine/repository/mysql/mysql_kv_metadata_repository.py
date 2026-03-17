from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlKvMetadataRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_kv_metadata_repository import AbstractJdbcKvMetadataRepository
from engine.core.models.conditions.condition import Condition
from engine.repository.mysql.mysql_repository import MysqlRepository
from engine.core.models.kv.persisted_kv_metadata import PersistedKvMetadata


@dataclass(slots=True, kw_only=True)
class MysqlKvMetadataRepository(AbstractJdbcKvMetadataRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
