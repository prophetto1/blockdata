from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\services\JdbcFilterService.java
# WARNING: Unresolved types: AggregateFunction, Provider, jooq, org

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter
from engine.core.services.abstract_filter_service import AbstractFilterService
from engine.jdbc.repository.abstract_jdbc_dashboard_repository import AbstractJdbcDashboardRepository
from engine.jdbc.repository.abstract_jdbc_execution_repository import AbstractJdbcExecutionRepository
from engine.core.models.dashboards.aggregation_type import AggregationType
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
class JdbcFilterService(AbstractFilterService):
    execution_repository_interface: Provider[AbstractJdbcExecutionRepository] | None = None

    def build_aggregation(self, field: Field[Any], agg: AggregationType) -> AggregateFunction[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def build_where(self, fields_mapping: dict[F, str], filter: AbstractFilter[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def contains(self, query: SelectConditionStep[Record], field: str, filter: Contains[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def ends_with(self, query: SelectConditionStep[Record], field: str, filter: EndsWith[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def equal_to(self, query: SelectConditionStep[Record], field: str, filter: EqualTo[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def greater_than(self, query: SelectConditionStep[Record], field: str, filter: GreaterThan[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def greater_than_or_equal_to(self, query: SelectConditionStep[Record], field: str, filter: GreaterThanOrEqualTo[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def in(self, query: SelectConditionStep[Record], field: str, filter: In[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def is_false(self, query: SelectConditionStep[Record], field: str, filter: IsFalse[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def is_not_null(self, query: SelectConditionStep[Record], field: str, filter: IsNotNull[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def is_null(self, query: SelectConditionStep[Record], field: str, filter: IsNull[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def is_true(self, query: SelectConditionStep[Record], field: str, filter: IsTrue[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def less_than(self, query: SelectConditionStep[Record], field: str, filter: LessThan[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def less_than_or_equal_to(self, query: SelectConditionStep[Record], field: str, filter: LessThanOrEqualTo[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def not_equal_to(self, query: SelectConditionStep[Record], field: str, filter: NotEqualTo[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def not_in(self, query: SelectConditionStep[Record], field: str, filter: NotIn[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def or(self, query: SelectConditionStep[Record], fields_mapping: dict[F, str], filter: Or[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def regex(self, query: SelectConditionStep[Record], field: str, filter: Regex[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def starts_with(self, query: SelectConditionStep[Record], field: str, filter: StartsWith[F]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def contains_condition(self, field: str, filter: Contains[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def ends_with_condition(self, field: str, filter: EndsWith[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def equal_to_condition(self, field: str, filter: EqualTo[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def greater_than_condition(self, field: str, filter: GreaterThan[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def greater_than_or_equal_to_condition(self, field: str, filter: GreaterThanOrEqualTo[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def in_condition(self, field: str, filter: In[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def is_false_condition(self, field: str, filter: IsFalse[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def is_not_null_condition(self, field: str, filter: IsNotNull[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def is_null_condition(self, field: str, filter: IsNull[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def is_true_condition(self, field: str, filter: IsTrue[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def less_than_condition(self, field: str, filter: LessThan[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def less_than_or_equal_to_condition(self, field: str, filter: LessThanOrEqualTo[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def not_equal_to_condition(self, field: str, filter: NotEqualTo[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def not_in_condition(self, field: str, filter: NotIn[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def or_condition(self, fields_mapping: dict[F, str], filter: Or[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def regex_condition(self, field: str, filter: Regex[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java

    def starts_with_condition(self, field: str, filter: StartsWith[F]) -> org.jooq.Condition:
        raise NotImplementedError  # TODO: translate from Java
