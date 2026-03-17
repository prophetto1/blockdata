from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\ColumnDescriptor.java
# WARNING: Unresolved types: Enum, F

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.aggregation_type import AggregationType


@dataclass(slots=True, kw_only=True)
class ColumnDescriptor:
    field: F | None = None
    display_name: str | None = None
    agg: AggregationType | None = None
    label_key: str | None = None
