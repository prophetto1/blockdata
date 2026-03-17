from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\AbstractJdbcRepository.java
# WARNING: Unresolved types: Class, DSLContext, E, Field, Function, InsertOnDuplicateSetMoreStep, ObjectMapper, Pageable, R, Record, RecordMapper, Select, SelectConditionStep, T, Timestamp

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar, Optional

from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.conditions.condition import Condition
from engine.jdbc.jdbc_table_config import JdbcTableConfig
from engine.jdbc.jooq_dsl_context_wrapper import JooqDSLContextWrapper
from engine.core.models.executions.metrics.metric_aggregation import MetricAggregation
from engine.plugin.core.dashboard.chart.table import Table


@dataclass(slots=True, kw_only=True)
class AbstractJdbcRepository(ABC):
    mapper: ClassVar[ObjectMapper]
    cls: Class[T] | None = None
    deserializer: Function[Record, T] | None = None
    dsl_context_wrapper: JooqDSLContextWrapper | None = None
    table: Table[Record] | None = None

    @abstractmethod
    def full_text_condition(self, fields: list[str], query: str) -> Condition:
        ...

    def key(self, entity: T) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def persist_fields(self, entity: T) -> dict[Field[Any], Any]:
        raise NotImplementedError  # TODO: translate from Java

    def count(self, condition: Condition) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def persist(self, entity: T) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def persist(self, entity: T, fields: dict[Field[Any], Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def persist(self, entity: T, dsl_context: DSLContext, fields: dict[Field[Any], Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def persist_batch(self, items: list[T]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def persist_batch(self, item_with_fields: dict[T, dict[Field[Any], Any]]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def build_insert_request(self, entity: T, fields: dict[Field[Any], Any], dsl_context: DSLContext) -> InsertOnDuplicateSetMoreStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, entity: T) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, dsl_context: DSLContext, entity: T) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def map(self, record: R) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def map_metric_aggregation(self, record: R, group_by_type: str) -> MetricAggregation:
        raise NotImplementedError  # TODO: translate from Java

    def get_date(self, record: R, group_by_type: str) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def deserialize(self, record: str) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_one(self, select: Select[R]) -> Optional[T]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch(self, select: Select[R]) -> list[T]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_metric_stat(self, select: Select[Record], group_by_type: str) -> list[MetricAggregation]:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def fetch_page(self, context: DSLContext, select: SelectConditionStep[R], pageable: Pageable, mapper: RecordMapper[R, E]) -> ArrayListTotal[E]:
        ...

    def fetch_page(self, context: DSLContext, select: SelectConditionStep[R], pageable: Pageable) -> ArrayListTotal[T]:
        raise NotImplementedError  # TODO: translate from Java

    def build_query(self, context: DSLContext, select: SelectConditionStep[R], order_field: str) -> Select[R]:
        raise NotImplementedError  # TODO: translate from Java

    def fragments(self, query: str, yaml: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def sort(self, select: SelectConditionStep[R], pageable: Pageable) -> SelectConditionStep[R]:
        raise NotImplementedError  # TODO: translate from Java

    def limit(self, select: SelectConditionStep[R], pageable: Pageable) -> Select[R]:
        raise NotImplementedError  # TODO: translate from Java

    def pageable(self, select: SelectConditionStep[R], pageable: Pageable) -> Select[R]:
        raise NotImplementedError  # TODO: translate from Java

    def week_from_timestamp(self, timestamp_field: Field[Timestamp]) -> Field[int]:
        raise NotImplementedError  # TODO: translate from Java
