from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\filters\Or.java
# WARNING: Unresolved types: FilterType

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter


@dataclass(slots=True, kw_only=True)
class Or(AbstractFilter):
    """OR"""
    values: list[AbstractFilter[F]]
    type: FilterType = FilterType.OR
