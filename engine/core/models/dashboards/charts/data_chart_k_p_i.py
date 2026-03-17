from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\charts\DataChartKPI.java
# WARNING: Unresolved types: D, P, core, io, kestra, models

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.charts.chart import Chart
from engine.core.models.dashboards.data_filter_k_p_i import DataFilterKPI
from engine.plugin.core.dashboard.chart.kpis.kpi_option import KpiOption
from engine.core.models.annotations.plugin import Plugin


@dataclass(slots=True, kw_only=True)
class DataChartKPI(ABC, Chart):
    data: D

    def min_number_of_aggregations(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def max_number_of_aggregations(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
