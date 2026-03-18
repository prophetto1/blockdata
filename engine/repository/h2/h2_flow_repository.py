from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2FlowRepository.java
# WARNING: Unresolved types: Op

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_flow_repository import AbstractJdbcFlowRepository
from engine.core.models.flows.flow_interface import FlowInterface
from engine.repository.h2.h2_repository import H2Repository
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.core.models.query_filter import QueryFilter


@dataclass(slots=True, kw_only=True)
class H2FlowRepository(AbstractJdbcFlowRepository):

    def find_condition(self, query: str, labels: dict[str, str]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_source_code_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
