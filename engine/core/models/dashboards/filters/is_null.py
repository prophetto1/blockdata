from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\filters\IsNull.java
# WARNING: Unresolved types: FilterType

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter


@dataclass(slots=True, kw_only=True)
class IsNull(AbstractFilter):
    """IS_NULL"""
    type: FilterType = FilterType.IS_NULL
