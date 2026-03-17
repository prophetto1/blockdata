from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\chart\tables\TableColumnDescriptor.java
# WARNING: Unresolved types: Enum, F

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.column_descriptor import ColumnDescriptor


@dataclass(slots=True, kw_only=True)
class TableColumnDescriptor(ColumnDescriptor):
    column_alignment: Alignment = Alignment.LEFT

    class Alignment(str, Enum):
        LEFT = "LEFT"
        RIGHT = "RIGHT"
        CENTER = "CENTER"
