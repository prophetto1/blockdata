from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\DashboardRepositoryInterface.java

from datetime import datetime
from typing import Any, Optional, Protocol

from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.dashboards.dashboard import Dashboard
from engine.core.models.dashboards.charts.data_chart import DataChart
from engine.core.models.dashboards.charts.data_chart_kpi import DataChartKPI
from engine.core.models.dashboards.data_filter import DataFilter
from engine.core.models.dashboards.data_filter_kpi import DataFilterKPI


class DashboardRepositoryInterface(Protocol):
    def count_all_for_all_tenants(self) -> int: ...

    def is_enabled(self) -> bool: ...

    def get(self, tenant_id: str, id: str) -> Optional[Dashboard]: ...

    def list(self, pageable: Pageable, tenant_id: str, query: str) -> ArrayListTotal[Dashboard]: ...

    def find_all(self, tenant_id: str) -> list[Dashboard]: ...

    def find_all_with_no_acl(self, tenant_id: str) -> list[Dashboard]: ...

    def save(self, previous_dashboard: Dashboard, dashboard: Dashboard, source: str | None = None) -> Dashboard: ...

    def delete(self, tenant_id: str, id: str) -> Dashboard: ...

    def generate(self, tenant_id: str, data_chart: DataChart[Any, DataFilter[F, Any]], start_date: datetime, end_date: datetime, pageable: Pageable) -> ArrayListTotal[dict[str, Any]]: ...

    def generate_kpi(self, tenant_id: str, data_chart: DataChartKPI[Any, DataFilterKPI[F, Any]], start_date: datetime, end_date: datetime) -> list[dict[str, Any]]: ...
