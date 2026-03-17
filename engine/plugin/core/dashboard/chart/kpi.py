from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\chart\KPI.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.dashboards.charts.data_chart_kpi import DataChartKPI
from engine.core.models.dashboards.data_filter_kpi import DataFilterKPI
from engine.plugin.core.dashboard.chart.kpis.kpi_option import KpiOption


@dataclass(slots=True, kw_only=True)
class KPI(DataChartKPI):
    """Track a specific value."""

    def min_number_of_aggregations(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def max_number_of_aggregations(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
