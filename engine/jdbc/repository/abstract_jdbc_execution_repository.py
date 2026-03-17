from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcExecutionRepository.java
# WARNING: Unresolved types: ApplicationContext, ApplicationEventPublisher, ChildFilter, ChronoUnit, DSLContext, Date, Enum, F, Field, Fields, FlowFilter, Flux, Function, GroupType, IllegalArgumentException, Op, Pageable, Pair, Record, Record1, Results, SelectConditionStep, T, io, jdbc, kestra

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar, Optional

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter
from engine.jdbc.repository.abstract_jdbc_crud_repository import AbstractJdbcCrudRepository
from engine.jdbc.runner.abstract_jdbc_executor_state_storage import AbstractJdbcExecutorStateStorage
from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.conditions.condition import Condition
from engine.core.events.crud_event import CrudEvent
from engine.core.models.executions.statistics.daily_execution_statistics import DailyExecutionStatistics
from engine.core.models.dashboards.data_filter import DataFilter
from engine.core.models.dashboards.data_filter_kpi import DataFilterKPI
from engine.core.utils.date_utils import DateUtils
from engine.core.utils.either import Either
from engine.core.models.executions.execution import Execution
from engine.core.models.executions.statistics.execution_count import ExecutionCount
from engine.core.repositories.execution_repository_interface import ExecutionRepositoryInterface
from engine.core.models.executions.statistics.execution_statistics import ExecutionStatistics
from engine.plugin.core.dashboard.data.executions import Executions
from engine.core.runners.executor import Executor
from engine.core.runners.executor_state import ExecutorState
from engine.core.models.executions.statistics.flow import Flow
from engine.core.models.flows.flow_scope import FlowScope
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.jdbc.runner.jdbc_queue_indexer_interface import JdbcQueueIndexerInterface
from engine.core.contexts.kestra_config import KestraConfig
from engine.core.models.query_filter import QueryFilter
from engine.core.queues.queue_interface import QueueInterface
from engine.core.models.collectors.result import Result
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class AbstractJdbcExecutionRepository(ABC, AbstractJdbcCrudRepository):
    state_current_field: ClassVar[Field[str]]
    namespace_field: ClassVar[Field[str]]
    start_date_field: ClassVar[Field[Any]]
    normal_kind_condition: ClassVar[Condition]
    fields_mapping: dict[Executions.Fields, str]
    fetch_size: ClassVar[int] = 100
    event_publisher: ApplicationEventPublisher[CrudEvent[Execution]] | None = None
    application_context: ApplicationContext | None = None
    executor_state_storage: AbstractJdbcExecutorStateStorage | None = None
    execution_queue: QueueInterface[Execution] | None = None
    kestra_config: KestraConfig | None = None
    filter_service: JdbcFilterService | None = None

    def date_fields(self) -> set[Executions.Fields]:
        raise NotImplementedError  # TODO: translate from Java

    def date_filter_field(self) -> Executions.Fields:
        raise NotImplementedError  # TODO: translate from Java

    def execution_queue(self) -> QueueInterface[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_by_trigger_execution_id(self, tenant_id: str, trigger_execution_id: str) -> Flux[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def find_latest_for_states(self, tenant_id: str, namespace: str, flow_id: str, states: list[State.Type]) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_id(self, tenant_id: str, id: str, allow_deleted: bool) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_id_without_acl(self, tenant_id: str, id: str) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_id(self, tenant_id: str, id: str, allow_deleted: bool, with_access_control: bool) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def find_condition(self, query: str, labels: dict[str, str]) -> Condition:
        ...

    def find_query_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def find_label_condition(self, value: Either[dict[Any, Any], str], operation: QueryFilter.Op) -> Condition:
        ...

    def states_filter(self, state: list[State.Type]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, pageable: Pageable, tenant_id: str, filters: list[QueryFilter]) -> ArrayListTotal[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, query: str, tenant_id: str, scope: list[FlowScope], namespace: str, flow_id: str, start_date: datetime, end_date: datetime, state: list[State.Type], labels: dict[str, str], trigger_execution_id: str, child_filter: ChildFilter, deleted: bool) -> Flux[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def compute_find_condition(self, filters: list[QueryFilter]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_select(self, context: DSLContext, query: str, tenant_id: str, scope: list[FlowScope], namespace: str, flow_id: str, start_date: datetime, end_date: datetime, state: list[State.Type], labels: dict[str, str], trigger_execution_id: str, child_filter: ChildFilter, deleted: bool) -> SelectConditionStep[Record1[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_flow_id(self, tenant_id: str, namespace: str, id: str, pageable: Pageable) -> ArrayListTotal[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def find_async(self, tenant_id: str, filters: list[QueryFilter]) -> Flux[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def daily_statistics_for_all_tenants(self, query: str, namespace: str, flow_id: str, start_date: datetime, end_date: datetime, group_by: DateUtils.GroupType) -> list[DailyExecutionStatistics]:
        raise NotImplementedError  # TODO: translate from Java

    def daily_statistics(self, query: str, tenant_id: str, scope: list[FlowScope], namespace: str, flow_id: str, start_date: datetime, end_date: datetime, group_by: DateUtils.GroupType, states: list[State.Type]) -> list[DailyExecutionStatistics]:
        raise NotImplementedError  # TODO: translate from Java

    def daily_statistics_query_map_record(self, records: Result[Record], start_date: datetime, end_date: datetime, group_type: DateUtils.GroupType) -> list[DailyExecutionStatistics]:
        raise NotImplementedError  # TODO: translate from Java

    def daily_statistics_query_for_all_tenants(self, fields: list[Field[Any]], query: str, namespace: str, flow_id: str, flows: list[FlowFilter], start_date: datetime, end_date: datetime, group_by: DateUtils.GroupType, state: list[State.Type]) -> Results:
        raise NotImplementedError  # TODO: translate from Java

    def daily_statistics_query(self, fields: list[Field[Any]], query: str, tenant_id: str, scope: list[FlowScope], namespace: str, flow_id: str, flows: list[FlowFilter], start_date: datetime, end_date: datetime, group_by: DateUtils.GroupType, state: list[State.Type]) -> Results:
        raise NotImplementedError  # TODO: translate from Java

    def daily_statistics_query(self, default_filter: Condition, fields: list[Field[Any]], query: str, scope: list[FlowScope], namespace: str, flow_id: str, flows: list[FlowFilter], start_date: datetime, end_date: datetime, group_by: DateUtils.GroupType, state: list[State.Type]) -> Results:
        raise NotImplementedError  # TODO: translate from Java

    def filtering_query(self, select: SelectConditionStep[T], scope: list[FlowScope], namespace: str, flow_id: str, flows: list[FlowFilter], query: str, labels: dict[str, str], trigger_execution_id: str, child_filter: ChildFilter) -> SelectConditionStep[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def fill_date(results: list[DailyExecutionStatistics], start_date: datetime, end_date: datetime) -> list[DailyExecutionStatistics]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def fill_date(results: list[DailyExecutionStatistics], start_date: datetime, end_date: datetime, unit: ChronoUnit, format: str, group_by_type: str) -> list[DailyExecutionStatistics]:
        raise NotImplementedError  # TODO: translate from Java

    def daily_execution_statistics_map(self, date: datetime, result: list[ExecutionStatistics], group_by_type: str) -> DailyExecutionStatistics:
        raise NotImplementedError  # TODO: translate from Java

    def execution_counts(self, tenant_id: str, flows: list[Flow], states: list[State.Type], start_date: datetime, end_date: datetime, namespaces: list[str]) -> list[ExecutionCount]:
        raise NotImplementedError  # TODO: translate from Java

    def last_executions(self, tenant_id: str, flows: list[FlowFilter]) -> list[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, execution: Execution) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def purge(self, execution: Execution) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def purge(self, executions: list[Execution]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def lock(self, execution_id: str, function: Function[Pair[Execution, ExecutorState], Pair[Executor, ExecutorState]]) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def sort_mapping(self) -> Function[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_data(self, tenant_id: str, descriptors: DataFilter[Executions.Fields, Any], start_date: datetime, end_date: datetime, pageable: Pageable) -> ArrayListTotal[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_value(self, tenant_id: str, data_filter: DataFilterKPI[Executions.Fields, Any], start_date: datetime, end_date: datetime, numerator_filter: bool) -> float:
        raise NotImplementedError  # TODO: translate from Java

    def column_to_field(self, column: ColumnDescriptor[Any], fields_mapping: dict[F, str]) -> Field[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def where(self, select_condition_step: SelectConditionStep[Record], jdbc_filter_service: JdbcFilterService, filters: list[AbstractFilter[F]], fields_mapping: dict[F, str]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def apply_state_filters(self, filters: list[AbstractFilter[F]], select_condition_step: SelectConditionStep[Record]) -> SelectConditionStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        ...
