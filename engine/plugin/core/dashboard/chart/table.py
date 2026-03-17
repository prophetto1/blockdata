from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\chart\Table.java
# WARNING: Unresolved types: D, Enum, F

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.charts.data_chart import DataChart
from engine.core.models.dashboards.data_filter import DataFilter
from engine.plugin.core.dashboard.chart.tables.table_column_descriptor import TableColumnDescriptor
from engine.plugin.core.dashboard.chart.tables.table_option import TableOption


@dataclass(slots=True, kw_only=True)
class Table(DataChart):
    """Display structured data in a clear, sortable table."""
    pass
