from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2MetricRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_metric_repository import AbstractJdbcMetricRepository
from engine.core.utils.date_utils import DateUtils
from engine.repository.h2.h2_repository import H2Repository
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.core.models.executions.metric_entry import MetricEntry


@dataclass(slots=True, kw_only=True)
class H2MetricRepository(AbstractJdbcMetricRepository):

    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java
