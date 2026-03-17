from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\chart\timeseries\TimeSeriesColumnDescriptor.java
# WARNING: Unresolved types: Enum, F

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.dashboards.graph_style import GraphStyle


@dataclass(slots=True, kw_only=True)
class TimeSeriesColumnDescriptor(ColumnDescriptor):
    graph_style: GraphStyle | None = None

    def get_graph_style(self) -> GraphStyle:
        raise NotImplementedError  # TODO: translate from Java
