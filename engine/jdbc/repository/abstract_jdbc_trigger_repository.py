from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcTriggerRepository.java
# WARNING: Unresolved types: Date, Field, Fields, Flux, Function, GroupType, IllegalArgumentException, Pageable, Temporal, io, jdbc, kestra

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar, Optional

from engine.jdbc.repository.abstract_jdbc_crud_repository import AbstractJdbcCrudRepository
from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.conditions.condition import Condition
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.dashboards.data_filter import DataFilter
from engine.core.models.dashboards.data_filter_k_p_i import DataFilterKPI
from engine.core.utils.date_utils import DateUtils
from engine.core.models.flows.flow import Flow
from engine.plugin.core.dashboard.data.i_triggers import ITriggers
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.jdbc.runner.jdbc_queue_indexer_interface import JdbcQueueIndexerInterface
from engine.core.models.query_filter import QueryFilter
from engine.core.runners.schedule_context_interface import ScheduleContextInterface
from engine.core.models.triggers.trigger import Trigger
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.repositories.trigger_repository_interface import TriggerRepositoryInterface
from engine.plugin.core.dashboard.data.triggers import Triggers


@dataclass(slots=True, kw_only=True)
class AbstractJdbcTriggerRepository(ABC, AbstractJdbcCrudRepository):
    n_a_m_e_s_p_a_c_e__f_i_e_l_d: ClassVar[Field[Any]] = field("namespace")
    fields_mapping: dict[Triggers.Fields, str] = Map.of(
        Triggers.Fields.ID, "key",
        Triggers.Fields.NAMESPACE, "namespace",
        Triggers.Fields.FLOW_ID, "flow_id",
        Triggers.Fields.TRIGGER_ID, "trigger_id",
        Triggers.Fields.EXECUTION_ID, "execution_id",
        Triggers.Fields.NEXT_EXECUTION_DATE, "next_execution_date",
        Triggers.Fields.WORKER_ID, "worker_id"
    )
    filter_service: JdbcFilterService | None = None

    def date_fields(self) -> set[Triggers.Fields]:
        raise NotImplementedError  # TODO: translate from Java

    def date_filter_field(self) -> Triggers.Fields:
        raise NotImplementedError  # TODO: translate from Java

    def find_last(self, trigger: TriggerContext) -> Optional[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_uid(self, uid: str) -> Optional[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_next_execution_date_ready_for_all_tenants(self, now: datetime, schedule_context_interface: ScheduleContextInterface) -> list[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_next_execution_date_ready_but_locked_triggers(self, now: datetime) -> list[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def to_next_execution_time(self, now: datetime) -> Temporal:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, trigger: Trigger, schedule_context_interface: ScheduleContextInterface) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def create(self, trigger: Trigger) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, trigger: Trigger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def update(self, flow: Flow, abstract_trigger: AbstractTrigger, condition_context: ConditionContext) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def lock(self, trigger_uid: str, function: Function[Trigger, Trigger]) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, pageable: Pageable, tenant_id: str, filters: list[QueryFilter]) -> ArrayListTotal[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, pageable: Pageable, query: str, tenant_id: str, namespace: str, flow_id: str, worker_id: str) -> ArrayListTotal[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def find_async(self, tenant_id: str, filters: list[QueryFilter]) -> Flux[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def full_text_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_query_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def default_filter(self, tenant_id: str, allow_deleted: bool) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def default_filter(self) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def sort_mapping(self) -> Function[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_data(self, tenant_id: str, descriptors: DataFilter[Triggers.Fields, Any], start_date: datetime, end_date: datetime, pageable: Pageable) -> ArrayListTotal[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_value(self, tenant_id: str, data_filter: DataFilterKPI[ITriggers.Fields, Any], start_date: datetime, end_date: datetime, numerator_filter: bool) -> float:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        ...
