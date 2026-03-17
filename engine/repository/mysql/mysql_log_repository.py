from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlLogRepository.java
# WARNING: Unresolved types: Date, Field, GroupType

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_log_repository import AbstractJdbcLogRepository
from engine.core.models.conditions.condition import Condition
from engine.core.utils.date_utils import DateUtils
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.core.models.executions.log_entry import LogEntry
from engine.repository.mysql.mysql_repository import MysqlRepository


@dataclass(slots=True, kw_only=True)
class MysqlLogRepository(AbstractJdbcLogRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java
