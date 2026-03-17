from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresLogRepository.java
# WARNING: Unresolved types: Date, Enum, F, Field, GroupType, Level, Record, SelectConditionStep

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter
from engine.jdbc.repository.abstract_jdbc_log_repository import AbstractJdbcLogRepository
from engine.core.models.conditions.condition import Condition
from engine.core.utils.date_utils import DateUtils
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.core.models.executions.log_entry import LogEntry
from engine.repository.postgres.postgres_repository import PostgresRepository


@dataclass(slots=True, kw_only=True)
class PostgresLogRepository(AbstractJdbcLogRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def levels_condition(self, levels: list[Level]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java

    def where(self, select_condition_step: SelectConditionStep[Record], jdbc_filter_service: JdbcFilterService, filters: list[AbstractFilter[F]], fields_mapping: dict[F, str]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java
