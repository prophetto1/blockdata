from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2KvMetadataRepositoryService.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.models.kv.persisted_kv_metadata import PersistedKvMetadata


@dataclass(slots=True, kw_only=True)
class H2KvMetadataRepositoryService(ABC):

    @staticmethod
    def find_condition(jdbc_repository: AbstractJdbcRepository[PersistedKvMetadata], query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
