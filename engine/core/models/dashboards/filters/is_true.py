from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\filters\IsTrue.java
# WARNING: Unresolved types: Enum, F, FilterType

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter


@dataclass(slots=True, kw_only=True)
class IsTrue(AbstractFilter):
    """IS_TRUE"""
    type: FilterType = FilterType.IS_TRUE
