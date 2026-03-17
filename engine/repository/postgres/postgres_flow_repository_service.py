from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresFlowRepositoryService.java
# WARNING: Unresolved types: Op

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.models.conditions.condition import Condition
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.query_filter import QueryFilter


@dataclass(slots=True, kw_only=True)
class PostgresFlowRepositoryService(ABC):

    @staticmethod
    def find_condition(jdbc_repository: AbstractJdbcRepository[Any], query: str, labels: dict[str, str]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def find_source_code_condition(jdbc_repository: AbstractJdbcRepository[Any], query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def find_condition(labels: Any, operation: QueryFilter.Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
