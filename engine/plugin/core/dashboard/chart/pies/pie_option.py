from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\chart\pies\PieOption.java

from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.models.dashboards.chart_option import ChartOption
from engine.core.models.dashboards.charts.legend_option import LegendOption
from engine.core.models.dashboards.charts.tooltip_behaviour import TooltipBehaviour
from engine.core.models.dashboards.with_legend import WithLegend
from engine.core.models.dashboards.with_tooltip import WithTooltip


@dataclass(slots=True, kw_only=True)
class PieOption(ChartOption):
    legend: LegendOption
    tooltip: TooltipBehaviour = TooltipBehaviour.ALL
    graph_style: PieGraphStyle = PieGraphStyle.DONUT
    color_by_column: str | None = None

    def needed_columns(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    class PieGraphStyle(str, Enum):
        PIE = "PIE"
        DONUT = "DONUT"
