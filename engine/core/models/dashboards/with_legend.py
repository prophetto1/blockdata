from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\WithLegend.java

from typing import Any, Protocol

from engine.core.models.dashboards.charts.legend_option import LegendOption


class WithLegend(Protocol):
    def get_legend(self) -> LegendOption: ...
