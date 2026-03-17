from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcDashboardRepository.java
# WARNING: Unresolved types: ConcurrentHashMap

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from logging import Logger, getLogger
from datetime import datetime
from typing import Any, ClassVar, Optional

from engine.jdbc.repository.abstract_jdbc_crud_repository import AbstractJdbcCrudRepository
from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.events.crud_event import CrudEvent
from engine.core.models.dashboards.dashboard import Dashboard
from engine.core.repositories.dashboard_repository_interface import DashboardRepositoryInterface
from engine.core.models.dashboards.charts.data_chart import DataChart
from engine.core.models.dashboards.charts.data_chart_kpi import DataChartKPI
from engine.core.models.dashboards.data_filter import DataFilter
from engine.core.models.dashboards.data_filter_kpi import DataFilterKPI
from engine.core.repositories.query_builder_interface import QueryBuilderInterface


@dataclass(slots=True, kw_only=True)
class AbstractJdbcDashboardRepository(ABC, AbstractJdbcCrudRepository):
    query_builder_by_handled_fields: dict[type[Any], QueryBuilderInterface[Any]]
    logger: ClassVar[Logger] = getLogger(__name__)
    event_publisher: ApplicationEventPublisher[CrudEvent[Dashboard]] | None = None
    query_builders: list[QueryBuilderInterface[Any]] | None = None

    def get(self, tenant_id: str, id: str) -> Optional[Dashboard]:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def find_condition(self, query: str) -> Condition:
        ...

    def list(self, pageable: Pageable, tenant_id: str, query: str) -> ArrayListTotal[Dashboard]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_with_no_acl(self, tenant_id: str) -> list[Dashboard]:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, previous_dashboard: Dashboard, dashboard: Dashboard, source: str) -> Dashboard:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, tenant_id: str, id: str) -> Dashboard:
        raise NotImplementedError  # TODO: translate from Java

    def generate(self, tenant_id: str, data_chart: DataChart[Any, DataFilter[F, Any]], start_date: datetime, end_date: datetime, pageable: Pageable) -> ArrayListTotal[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def generate_kpi(self, tenant_id: str, data_chart: DataChartKPI[Any, DataFilterKPI[F, Any]], start_date: datetime, end_date: datetime) -> list[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def is_enabled(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java
