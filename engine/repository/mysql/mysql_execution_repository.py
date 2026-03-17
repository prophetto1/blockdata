from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlExecutionRepository.java
# WARNING: Unresolved types: ApplicationContext, Date, Field, GroupType, Op, Timestamp

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_execution_repository import AbstractJdbcExecutionRepository
from engine.jdbc.runner.abstract_jdbc_executor_state_storage import AbstractJdbcExecutorStateStorage
from engine.core.models.conditions.condition import Condition
from engine.core.utils.date_utils import DateUtils
from engine.core.utils.either import Either
from engine.core.models.executions.execution import Execution
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.repository.mysql.mysql_repository import MysqlRepository
from engine.core.models.query_filter import QueryFilter


@dataclass(slots=True, kw_only=True)
class MysqlExecutionRepository(AbstractJdbcExecutionRepository):

    def find_condition(self, query: str, labels: dict[str, str]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_label_condition(self, input: Either[dict[Any, Any], str], operation: QueryFilter.Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def week_from_timestamp(self, timestamp_field: Field[Timestamp]) -> Field[int]:
        raise NotImplementedError  # TODO: translate from Java

    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java
