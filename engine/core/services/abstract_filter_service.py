from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\AbstractFilterService.java
# WARNING: Unresolved types: Enum, F, Q

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter
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
class AbstractFilterService:

    def add_filters(self, query: Q, fields_mapping: dict[F, str], filters: list[AbstractFilter[F]]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def contains(self, query: Q, field: str, filter: Contains[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def ends_with(self, query: Q, field: str, filter: EndsWith[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def equal_to(self, query: Q, field: str, filter: EqualTo[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def greater_than(self, query: Q, field: str, filter: GreaterThan[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def greater_than_or_equal_to(self, query: Q, field: str, filter: GreaterThanOrEqualTo[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def in(self, query: Q, field: str, filter: In[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def is_false(self, query: Q, field: str, filter: IsFalse[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def is_not_null(self, query: Q, field: str, filter: IsNotNull[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def is_null(self, query: Q, field: str, filter: IsNull[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def is_true(self, query: Q, field: str, filter: IsTrue[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def less_than(self, query: Q, field: str, filter: LessThan[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def less_than_or_equal_to(self, query: Q, field: str, filter: LessThanOrEqualTo[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def not_equal_to(self, query: Q, field: str, filter: NotEqualTo[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def not_in(self, query: Q, field: str, filter: NotIn[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def or(self, query: Q, fields_mapping: dict[F, str], filter: Or[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def regex(self, query: Q, field: str, filter: Regex[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    def starts_with(self, query: Q, field: str, filter: StartsWith[F]) -> Q:
        raise NotImplementedError  # TODO: translate from Java
