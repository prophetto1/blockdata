from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\chart\kpis\KpiOption.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.chart_option import ChartOption


@dataclass(slots=True, kw_only=True)
class KpiOption(ChartOption):
    number_type: NumberType = NumberType.FLAT

    class NumberType(str, Enum):
        FLAT = "FLAT"
        PERCENTAGE = "PERCENTAGE"
