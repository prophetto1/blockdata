from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlMetricRepository.java
# WARNING: Unresolved types: Timestamp

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_metric_repository import AbstractJdbcMetricRepository
from engine.core.utils.date_utils import DateUtils
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.core.models.executions.metric_entry import MetricEntry
from engine.repository.mysql.mysql_repository import MysqlRepository


@dataclass(slots=True, kw_only=True)
class MysqlMetricRepository(AbstractJdbcMetricRepository):

    def week_from_timestamp(self, timestamp_field: Field[Timestamp]) -> Field[int]:
        raise NotImplementedError  # TODO: translate from Java

    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java
