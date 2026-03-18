from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresExecutionRepositoryService.java
# WARNING: Unresolved types: Op

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.utils.either import Either
from engine.core.models.executions.execution import Execution
from engine.core.models.query_filter import QueryFilter
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class PostgresExecutionRepositoryService(ABC):

    @staticmethod
    def find_condition(jdbc_repository: AbstractJdbcRepository[Execution], query: str, labels: dict[str, str]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def find_label_condition(input: Either[dict[Any, Any], str], operation: QueryFilter.Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def states_filter(state: list[State.Type]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
