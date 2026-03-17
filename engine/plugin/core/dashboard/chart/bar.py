from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\chart\Bar.java
# WARNING: Unresolved types: D, Enum, F

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.dashboard.chart.bars.bar_option import BarOption
from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.dashboards.charts.data_chart import DataChart
from engine.core.models.dashboards.data_filter import DataFilter


@dataclass(slots=True, kw_only=True)
class Bar(DataChart):
    """Compare categorical data visually with bar charts."""

    def min_number_of_aggregations(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def max_number_of_aggregations(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
