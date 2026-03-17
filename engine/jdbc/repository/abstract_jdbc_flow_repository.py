from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcFlowRepository.java
# WARNING: Unresolved types: ApplicationContext, ApplicationEventPublisher, ConstraintViolationException, DSLContext, E, Field, Fields, Flux, Name, ObjectMapper, Op, OrderField, Pageable, R, Record, Record3, Resource, SelectConditionStep, io, jdbc, kestra

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar, Optional

from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.conditions.condition import Condition
from engine.core.events.crud_event import CrudEvent
from engine.core.events.crud_event_type import CrudEventType
from engine.core.models.dashboards.data_filter import DataFilter
from engine.core.models.dashboards.data_filter_k_p_i import DataFilterKPI
from engine.core.utils.either import Either
from engine.core.models.executions.statistics.flow import Flow
from engine.core.models.flows.flow_for_execution import FlowForExecution
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.exceptions.flow_processing_exception import FlowProcessingException
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.plugin.core.dashboard.data.flows import Flows
from engine.core.models.flows.generic_flow import GenericFlow
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.core.models.validations.model_validator import ModelValidator
from engine.core.services.plugin_default_service import PluginDefaultService
from engine.core.models.query_filter import QueryFilter
from engine.core.queues.queue_exception import QueueException
from engine.core.queues.queue_interface import QueueInterface
from engine.core.models.search_result import SearchResult
from engine.plugin.core.dashboard.chart.table import Table
from engine.core.models.triggers.trigger import Trigger


@dataclass(slots=True, kw_only=True)
class AbstractJdbcFlowRepository(ABC, AbstractJdbcRepository):
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JdbcMapper.of()
    n_a_m_e_s_p_a_c_e__f_i_e_l_d: ClassVar[Field[str]] = field("namespace", String.class)
    s_o_u_r_c_e__f_i_e_l_d: ClassVar[Field[str]] = field("source_code", String.class)
    r_e_v_i_s_i_o_n__f_i_e_l_d: ClassVar[Field[int]] = field("revision", Integer.class)
    fields_mapping: dict[Flows.Fields, str] = Map.of(
        Flows.Fields.ID, "key",
        Flows.Fields.NAMESPACE, "namespace",
        Flows.Fields.REVISION, "revision"
    )
    flow_queue: QueueInterface[FlowInterface] | None = None
    trigger_queue: QueueInterface[Trigger] | None = None
    event_publisher: ApplicationEventPublisher[CrudEvent[FlowInterface]] | None = None
    model_validator: ModelValidator | None = None
    plugin_default_service: PluginDefaultService | None = None
    filter_service: JdbcFilterService | None = None
    jdbc_repository: io.kestra.jdbc.AbstractJdbcRepository[FlowInterface] | None = None

    def date_fields(self) -> set[Flows.Fields]:
        raise NotImplementedError  # TODO: translate from Java

    def date_filter_field(self) -> Flows.Fields:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_id(self, tenant_id: str, namespace: str, id: str, revision: Optional[int], allow_deleted: bool) -> Optional[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_id_without_acl(self, tenant_id: str, namespace: str, id: str, revision: Optional[int]) -> Optional[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def from_last_revision(self, asterisk: bool) -> Table[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def no_acl_default_filter(self, tenant_id: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def default_execution_filter(self, tenant_id: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_id_with_source(self, tenant_id: str, namespace: str, id: str, revision: Optional[int], allow_deleted: bool) -> Optional[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_id_with_source_without_acl(self, tenant_id: str, namespace: str, id: str, revision: Optional[int]) -> Optional[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def find_revisions(self, tenant_id: str, namespace: str, id: str, allow_deleted: bool) -> list[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def find_revisions(self, tenant_id: str, namespace: str, id: str, allow_deleted: bool, revisions: list[int]) -> list[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def count(self, tenant_id: str) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def find_all(self, tenant_id: str) -> list[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_for_all_tenants(self) -> list[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_with_source(self, tenant_id: str) -> list[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_with_source_with_no_acl(self, tenant_id: str) -> list[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_with_source_for_all_tenants(self) -> list[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_namespace(self, tenant_id: str, namespace: str) -> list[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_namespace_prefix(self, tenant_id: str, namespace_prefix: str) -> list[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_namespace_executable(self, tenant_id: str, namespace: str) -> list[FlowForExecution]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_namespace_select(self, namespace: str) -> SelectConditionStep[Record3[Any, Any, str]]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_namespace_prefix_select(self, namespace_prefix: str) -> SelectConditionStep[Record3[Any, Any, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_namespace_with_source(self, tenant_id: str, namespace: str) -> list[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_namespace_prefix_with_source(self, tenant_id: str, namespace_prefix: str) -> list[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def full_text_select(self, tenant_id: str, context: DSLContext, field: list[Field[Any]]) -> SelectConditionStep[R]:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def find_condition(self, query: str, labels: dict[str, str]) -> Condition:
        ...

    def find_query_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def find_condition(self, value: Any, operation: QueryFilter.Op) -> Condition:
        ...

    def find_label_condition(self, value: Either[dict[Any, Any], str], operation: QueryFilter.Op) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, pageable: Pageable, tenant_id: str, filters: list[QueryFilter]) -> ArrayListTotal[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def find_with_source(self, pageable: Pageable, tenant_id: str, filters: list[QueryFilter]) -> ArrayListTotal[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def get_find_flow_select(self, tenant_id: str, filters: list[QueryFilter], context: DSLContext, additional_fields_to_select: list[Field[Any]]) -> SelectConditionStep[R]:
        raise NotImplementedError  # TODO: translate from Java

    def get_column_name(self, field: QueryFilter.Field) -> Name:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def find_source_code_condition(self, query: str) -> Condition:
        ...

    def find_source_code(self, pageable: Pageable, query: str, tenant_id: str, namespace: str) -> ArrayListTotal[SearchResult[Flow]]:
        raise NotImplementedError  # TODO: translate from Java

    def create(self, flow: GenericFlow) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def update(self, flow: GenericFlow, previous: FlowInterface) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, flow: GenericFlow, crud_event_type: CrudEventType) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, flow: FlowInterface) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def delete_revisions(self, tenant_id: str, namespace: str, id: str, revisions: list[int]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_flow(self, flow: FlowInterface, existing_flow: FlowWithSource) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def find_distinct_namespace(self, tenant_id: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def find_distinct_namespace_executable(self, tenant_id: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def find_async(self, tenant_id: str, filters: list[QueryFilter]) -> Flux[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def find_async(self, tenant_id: str, filters: list[QueryFilter], resource: QueryFilter.Resource) -> Flux[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def find_async(self, default_filter: Condition, condition: Condition) -> Flux[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def last_revision(self, tenant_id: str, namespace: str, id: str) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def exist_any_no_acl(self, tenant_id: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_data(self, tenant_id: str, descriptors: DataFilter[Flows.Fields, Any], start_date: datetime, end_date: datetime, pageable: Pageable) -> ArrayListTotal[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_value(self, tenant_id: str, data_filter: DataFilterKPI[Flows.Fields, Any], start_date: datetime, end_date: datetime, numerator_filter: bool) -> float:
        raise NotImplementedError  # TODO: translate from Java
