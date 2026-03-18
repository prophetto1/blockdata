from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\WithTooltip.java

from typing import Any, Protocol

from engine.core.models.dashboards.charts.tooltip_behaviour import TooltipBehaviour


class WithTooltip(Protocol):
    def get_tooltip(self) -> TooltipBehaviour: ...
