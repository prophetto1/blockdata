from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\filters\AbstractFilter.java
# WARNING: Unresolved types: Enum, F

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.models.dashboards.filters.contains import Contains
from engine.core.models.dashboards.filters.ends_with import EndsWith
from engine.core.models.dashboards.filters.equal_to import EqualTo
from engine.core.models.dashboards.filters.greater_than import GreaterThan
from engine.core.models.dashboards.filters.greater_than_or_equal_to import GreaterThanOrEqualTo
from engine.core.models.dashboards.filters.in import In
from engine.core.models.dashboards.filters.is_false import IsFalse
from engine.core.models.dashboards.filters.is_not_null import IsNotNull
from engine.core.models.dashboards.filters.is_null import IsNull
from engine.core.models.dashboards.filters.is_true import IsTrue
from engine.core.models.dashboards.filters.less_than import LessThan
from engine.core.models.dashboards.filters.less_than_or_equal_to import LessThanOrEqualTo
from engine.core.models.dashboards.filters.not_equal_to import NotEqualTo
from engine.core.models.dashboards.filters.not_in import NotIn
from engine.core.models.dashboards.filters.or import Or
from engine.core.models.dashboards.filters.regex import Regex
from engine.core.models.dashboards.filters.starts_with import StartsWith


@dataclass(slots=True, kw_only=True)
class AbstractFilter(ABC):
    field: F
    label_key: str | None = None

    @abstractmethod
    def get_type(self) -> FilterType:
        ...

    def equals(self, o: Any) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    class FilterType(str, Enum):
        CONTAINS = "CONTAINS"
        ENDS_WITH = "ENDS_WITH"
        EQUAL_TO = "EQUAL_TO"
        GREATER_THAN = "GREATER_THAN"
        GREATER_THAN_OR_EQUAL_TO = "GREATER_THAN_OR_EQUAL_TO"
        IN = "IN"
        IS_FALSE = "IS_FALSE"
        IS_NOT_NULL = "IS_NOT_NULL"
        IS_NULL = "IS_NULL"
        IS_TRUE = "IS_TRUE"
        LESS_THAN = "LESS_THAN"
        LESS_THAN_OR_EQUAL_TO = "LESS_THAN_OR_EQUAL_TO"
        NOT_EQUAL_TO = "NOT_EQUAL_TO"
        NOT_IN = "NOT_IN"
        OR = "OR"
        REGEX = "REGEX"
        STARTS_WITH = "STARTS_WITH"
