from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\filters\Contains.java
# WARNING: Unresolved types: Enum, F, FilterType, Number

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter


@dataclass(slots=True, kw_only=True)
class Contains(AbstractFilter):
    """CONTAINS"""
    value: Any
    type: FilterType = FilterType.CONTAINS
