from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\JdbcFlowRepositoryService.java
# WARNING: Unresolved types: Record

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.models.conditions.condition import Condition
from engine.core.models.flows.flow import Flow
from engine.core.models.flows.flow_interface import FlowInterface
from engine.plugin.core.dashboard.chart.table import Table


@dataclass(slots=True, kw_only=True)
class JdbcFlowRepositoryService(ABC):

    @staticmethod
    def last_revision(jdbc_repository: AbstractJdbcRepository[Any], asterisk: bool) -> Table[Record]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def find_condition(jdbc_repository: AbstractJdbcRepository[Flow], query: str, labels: dict[str, str]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def find_source_code_condition(jdbc_repository: AbstractJdbcRepository[Flow], query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
