from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresFlowRepository.java
# WARNING: Unresolved types: ApplicationContext, Op

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_flow_repository import AbstractJdbcFlowRepository
from engine.core.models.conditions.condition import Condition
from engine.core.models.flows.flow_interface import FlowInterface
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.repository.postgres.postgres_repository import PostgresRepository
from engine.core.models.query_filter import QueryFilter


@dataclass(slots=True, kw_only=True)
class PostgresFlowRepository(AbstractJdbcFlowRepository):

    def find_condition(self, query: str, labels: dict[str, str]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_condition(self, value: Any, operation: QueryFilter.Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_source_code_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
