from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\filters\Regex.java
# WARNING: Unresolved types: FilterType

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter


@dataclass(slots=True, kw_only=True)
class Regex(AbstractFilter):
    """REGEX"""
    value: str
    type: FilterType = FilterType.REGEX
