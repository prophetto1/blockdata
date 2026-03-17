from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresMetricRepository.java
# WARNING: Unresolved types: Date, Field, GroupType

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_metric_repository import AbstractJdbcMetricRepository
from engine.core.utils.date_utils import DateUtils
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.core.models.executions.metric_entry import MetricEntry
from engine.repository.postgres.postgres_repository import PostgresRepository


@dataclass(slots=True, kw_only=True)
class PostgresMetricRepository(AbstractJdbcMetricRepository):

    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java
