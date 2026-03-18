from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\chart\TimeSeries.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.charts.data_chart import DataChart
from engine.core.models.dashboards.data_filter import DataFilter
from engine.plugin.core.dashboard.chart.timeseries.time_series_column_descriptor import TimeSeriesColumnDescriptor
from engine.plugin.core.dashboard.chart.timeseries.time_series_option import TimeSeriesOption


@dataclass(slots=True, kw_only=True)
class TimeSeries(DataChart):
    """Track trends over time with dynamic time series charts."""

    def min_number_of_aggregations(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def max_number_of_aggregations(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
