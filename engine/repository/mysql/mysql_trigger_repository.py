from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlTriggerRepository.java
# WARNING: Unresolved types: Date, Field, GroupType, Temporal

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.jdbc.repository.abstract_jdbc_trigger_repository import AbstractJdbcTriggerRepository
from engine.core.models.conditions.condition import Condition
from engine.core.utils.date_utils import DateUtils
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.repository.mysql.mysql_repository import MysqlRepository
from engine.core.models.triggers.trigger import Trigger


@dataclass(slots=True, kw_only=True)
class MysqlTriggerRepository(AbstractJdbcTriggerRepository):

    def full_text_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java

    def to_next_execution_time(self, now: datetime) -> Temporal:
        raise NotImplementedError  # TODO: translate from Java
