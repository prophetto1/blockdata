from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\chart\Pie.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.dashboards.charts.data_chart import DataChart
from engine.core.models.dashboards.data_filter import DataFilter
from engine.plugin.core.dashboard.chart.pies.pie_option import PieOption


@dataclass(slots=True, kw_only=True)
class Pie(DataChart):
    """Show proportions and distributions using pie charts."""

    def min_number_of_aggregations(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def max_number_of_aggregations(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
