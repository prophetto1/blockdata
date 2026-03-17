from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2LogRepository.java
# WARNING: Unresolved types: Date, Field, GroupType

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_log_repository import AbstractJdbcLogRepository
from engine.core.models.conditions.condition import Condition
from engine.core.utils.date_utils import DateUtils
from engine.repository.h2.h2_repository import H2Repository
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.core.models.executions.log_entry import LogEntry


@dataclass(slots=True, kw_only=True)
class H2LogRepository(AbstractJdbcLogRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java
