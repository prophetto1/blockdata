from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\filters\LessThanOrEqualTo.java
# WARNING: Unresolved types: Enum, F, FilterType, Number

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter


@dataclass(slots=True, kw_only=True)
class LessThanOrEqualTo(AbstractFilter):
    """LESS_THAN_OR_EQUAL_TO"""
    value: Any
    type: FilterType = FilterType.LESS_THAN_OR_EQUAL_TO
