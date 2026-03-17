from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresExecutionRepository.java
# WARNING: Unresolved types: ApplicationContext, Date, Field, GroupType, Op

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_execution_repository import AbstractJdbcExecutionRepository
from engine.jdbc.runner.abstract_jdbc_executor_state_storage import AbstractJdbcExecutorStateStorage
from engine.core.models.conditions.condition import Condition
from engine.core.utils.date_utils import DateUtils
from engine.core.utils.either import Either
from engine.core.models.executions.execution import Execution
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.repository.postgres.postgres_repository import PostgresRepository
from engine.core.models.query_filter import QueryFilter
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class PostgresExecutionRepository(AbstractJdbcExecutionRepository):

    def states_filter(self, state: list[State.Type]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_condition(self, query: str, labels: dict[str, str]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_label_condition(self, input: Either[dict[Any, Any], str], operation: QueryFilter.Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java
