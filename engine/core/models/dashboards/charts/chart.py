from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\charts\Chart.java
# WARNING: Unresolved types: P, core, io, kestra, models

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.chart_option import ChartOption
from engine.core.models.annotations.plugin import Plugin


@dataclass(slots=True, kw_only=True)
class Chart:
    id: str
    type: str
    chart_options: P | None = None
