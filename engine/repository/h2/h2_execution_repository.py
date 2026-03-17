from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2ExecutionRepository.java
# WARNING: Unresolved types: Op

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_execution_repository import AbstractJdbcExecutionRepository
from engine.jdbc.runner.abstract_jdbc_executor_state_storage import AbstractJdbcExecutorStateStorage
from engine.core.utils.date_utils import DateUtils
from engine.core.utils.either import Either
from engine.core.models.executions.execution import Execution
from engine.repository.h2.h2_repository import H2Repository
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.core.models.query_filter import QueryFilter


@dataclass(slots=True, kw_only=True)
class H2ExecutionRepository(AbstractJdbcExecutionRepository):

    def find_condition(self, query: str, labels: dict[str, str]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_label_condition(self, input: Either[dict[Any, Any], str], operation: QueryFilter.Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java
