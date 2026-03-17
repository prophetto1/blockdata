from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcRepository.java
# WARNING: Unresolved types: Class, DSLContext, Date, Enum, F, Field, GroupType, Level, Name, OffsetDateTime, Op, Pageable, Record, Resource, SelectConditionStep, SelectHavingStep, SelectSeekStepN, T, Timestamp

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from datetime import timedelta
from typing import Any, ClassVar

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter
from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.conditions.condition import Condition
from engine.core.models.dashboards.data_filter import DataFilter
from engine.core.utils.date_utils import DateUtils
from engine.core.utils.either import Either
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.core.contexts.kestra_config import KestraConfig
from engine.core.models.query_filter import QueryFilter
from engine.core.models.flows.state import State
from engine.plugin.core.dashboard.chart.table import Table
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class AbstractJdbcRepository(ABC):
    deleted_field: ClassVar[Field[bool]]
    tenant_id_field: ClassVar[Field[str]]
    key_field: ClassVar[Field[str]]
    value_field: ClassVar[Field[Any]]
    fetch_size: ClassVar[int] = 100
    kestra_config: KestraConfig | None = None

    def default_filter(self) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def default_filter(self, allow_deleted: bool) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def default_filter(self, tenant_id: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def default_filter(self, tenant_id: str, allow_deleted: bool) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def default_filter_with_no_acl(self, tenant_id: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def default_filter_with_no_acl(self, tenant_id: str, deleted: bool) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def build_tenant_condition(self, tenant_id: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def field(name: str) -> Field[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def field(name: str, cls: Class[T]) -> Field[T]:
        raise NotImplementedError  # TODO: translate from Java

    def group_by_fields(self, duration: timedelta) -> list[Field[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def group_by_fields(self, duration: timedelta, with_as: bool) -> list[Field[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def week_from_timestamp(self, timestamp_field: Field[Timestamp]) -> Field[int]:
        raise NotImplementedError  # TODO: translate from Java

    def group_by_fields(self, duration: timedelta, date_field: str, group_by: DateUtils.GroupType) -> list[Field[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def group_by_fields(self, duration: timedelta, date_field: str, group_by: DateUtils.GroupType, with_as: bool) -> list[Field[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def select(self, context: DSLContext, filter_service: JdbcFilterService, descriptors: dict[str, Any], date_fields: list[Field[Date]], fields_mapping: dict[F, str], table: Table[Record], tenant_id: str) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def where(self, select_condition_step: SelectConditionStep[Record], jdbc_filter_service: JdbcFilterService, filters: list[AbstractFilter[F]], fields_mapping: dict[F, str]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def group_by(self, select_condition_step: SelectConditionStep[Record], columns_no_date: list[Any], date_fields: list[Field[Date]], fields_mapping: dict[F, str]) -> SelectHavingStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def order_by(self, select_having_step: SelectHavingStep[Record], descriptors: DataFilter[F, Any]) -> SelectSeekStepN[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_seek_step(self, select_seek_step: SelectSeekStepN[Record], pageable: Pageable) -> ArrayListTotal[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def column_to_field(self, column: ColumnDescriptor[Any], fields_mapping: dict[F, str]) -> Field[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def filter(self, filters: list[QueryFilter], date_column: str, resource: Resource) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def get_condition_on_field(self, field: QueryFilter.Field, value: Any, operation: QueryFilter.Op, date_column: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def get_date_condition(self, value: Any, operation: Op, date_column: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def primitive_or_to_string(o: Any) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_column_name(self, field: QueryFilter.Field) -> Name:
        raise NotImplementedError  # TODO: translate from Java

    def find_query_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_label_condition(self, value: Either[dict[Any, Any], str], operation: QueryFilter.Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_metadata_condition(self, metadata: dict[Any, Any], operation: QueryFilter.Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def generate_state_condition(self, value: Any, operation: QueryFilter.Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def states_filter(self, state: list[State.Type]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def handle_query(self, value: Any, operation: QueryFilter.Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def handle_child_filter(self, value: Any, operation: Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def handle_min_level_field(self, value: Any, operation: QueryFilter.Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def min_level_condition(self, min_level: Level) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def levels_condition(self, levels: list[Level]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def apply_date_condition(self, date_time: OffsetDateTime, operation: QueryFilter.Op, field_name: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def apply_scope_condition(self, value: Any, operation: QueryFilter.Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def apply_trigger_state_condition(self, value: Any, operation: QueryFilter.Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java

    def generate_date_fields(self, descriptors: DataFilter[F, Any], fields_mapping: dict[F, str], start_date: datetime, end_date: datetime, date_fields: set[F], group_type: DateUtils.GroupType) -> list[Field[Date]]:
        raise NotImplementedError  # TODO: translate from Java
