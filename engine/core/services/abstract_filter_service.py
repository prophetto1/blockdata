from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\AbstractFilterService.java

from abc import ABC, abstractmethod
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
class AbstractFilterService(ABC):

    def add_filters(self, query: Q, fields_mapping: dict[F, str], filters: list[AbstractFilter[F]]) -> Q:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def contains(self, query: Q, field: str, filter: Contains[F]) -> Q:
        ...

    @abstractmethod
    def ends_with(self, query: Q, field: str, filter: EndsWith[F]) -> Q:
        ...

    @abstractmethod
    def equal_to(self, query: Q, field: str, filter: EqualTo[F]) -> Q:
        ...

    @abstractmethod
    def greater_than(self, query: Q, field: str, filter: GreaterThan[F]) -> Q:
        ...

    @abstractmethod
    def greater_than_or_equal_to(self, query: Q, field: str, filter: GreaterThanOrEqualTo[F]) -> Q:
        ...

    @abstractmethod
    def in(self, query: Q, field: str, filter: In[F]) -> Q:
        ...

    @abstractmethod
    def is_false(self, query: Q, field: str, filter: IsFalse[F]) -> Q:
        ...

    @abstractmethod
    def is_not_null(self, query: Q, field: str, filter: IsNotNull[F]) -> Q:
        ...

    @abstractmethod
    def is_null(self, query: Q, field: str, filter: IsNull[F]) -> Q:
        ...

    @abstractmethod
    def is_true(self, query: Q, field: str, filter: IsTrue[F]) -> Q:
        ...

    @abstractmethod
    def less_than(self, query: Q, field: str, filter: LessThan[F]) -> Q:
        ...

    @abstractmethod
    def less_than_or_equal_to(self, query: Q, field: str, filter: LessThanOrEqualTo[F]) -> Q:
        ...

    @abstractmethod
    def not_equal_to(self, query: Q, field: str, filter: NotEqualTo[F]) -> Q:
        ...

    @abstractmethod
    def not_in(self, query: Q, field: str, filter: NotIn[F]) -> Q:
        ...

    @abstractmethod
    def or(self, query: Q, fields_mapping: dict[F, str], filter: Or[F]) -> Q:
        ...

    @abstractmethod
    def regex(self, query: Q, field: str, filter: Regex[F]) -> Q:
        ...

    @abstractmethod
    def starts_with(self, query: Q, field: str, filter: StartsWith[F]) -> Q:
        ...
