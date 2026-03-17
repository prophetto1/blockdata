from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\filters\GreaterThanOrEqualTo.java
# WARNING: Unresolved types: FilterType

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter


@dataclass(slots=True, kw_only=True)
class GreaterThanOrEqualTo(AbstractFilter):
    """GREATER_THAN_OR_EQUAL_TO"""
    value: Any
    type: FilterType = FilterType.GREATER_THAN_OR_EQUAL_TO
