from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\filters\GreaterThan.java
# WARNING: Unresolved types: Enum, F, FilterType, Number

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter


@dataclass(slots=True, kw_only=True)
class GreaterThan(AbstractFilter):
    """GREATER_THAN"""
    value: Any
    type: FilterType = FilterType.GREATER_THAN
