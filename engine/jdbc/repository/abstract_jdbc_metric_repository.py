from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcMetricRepository.java
# WARNING: Unresolved types: ChronoUnit, Date, Field, Fields, Function, GroupType, IllegalArgumentException, Pageable, io, jdbc, kestra

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar

from engine.jdbc.repository.abstract_jdbc_crud_repository import AbstractJdbcCrudRepository
from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.conditions.condition import Condition
from engine.core.models.dashboards.data_filter import DataFilter
from engine.core.models.dashboards.data_filter_k_p_i import DataFilterKPI
from engine.core.utils.date_utils import DateUtils
from engine.core.models.executions.execution import Execution
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.core.models.executions.metrics.metric_aggregation import MetricAggregation
from engine.core.models.executions.metrics.metric_aggregations import MetricAggregations
from engine.core.models.executions.metric_entry import MetricEntry
from engine.core.repositories.metric_repository_interface import MetricRepositoryInterface
from engine.plugin.core.dashboard.data.metrics import Metrics


@dataclass(slots=True, kw_only=True)
class AbstractJdbcMetricRepository(ABC, AbstractJdbcCrudRepository):
    n_o_r_m_a_l__k_i_n_d__c_o_n_d_i_t_i_o_n: ClassVar[Condition] = field("execution_kind").isNull().or(field("execution_kind").eq(ExecutionKind.NORMAL.name()))
    fields_mapping: dict[Metrics.Fields, str] = Map.of(
        Metrics.Fields.NAMESPACE, "namespace",
        Metrics.Fields.FLOW_ID, "flow_id",
        Metrics.Fields.TASK_ID, "task_id",
        Metrics.Fields.EXECUTION_ID, "execution_id",
        Metrics.Fields.TASK_RUN_ID, "taskrun_id",
        Metrics.Fields.NAME, "metric_name",
        Metrics.Fields.VALUE, "metric_value",
        Metrics.Fields.DATE, "timestamp"
    )
    filter_service: JdbcFilterService | None = None

    def date_fields(self) -> set[Metrics.Fields]:
        raise NotImplementedError  # TODO: translate from Java

    def date_filter_field(self) -> Metrics.Fields:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id(self, tenant_id: str, execution_id: str, pageable: Pageable) -> ArrayListTotal[MetricEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_id(self, tenant_id: str, execution_id: str, task_id: str, pageable: Pageable) -> ArrayListTotal[MetricEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_run_id(self, tenant_id: str, execution_id: str, task_run_id: str, pageable: Pageable) -> ArrayListTotal[MetricEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def flow_metrics(self, tenant_id: str, namespace: str, flow_id: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def task_metrics(self, tenant_id: str, namespace: str, flow_id: str, task_id: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def tasks_with_metrics(self, tenant_id: str, namespace: str, flow_id: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def aggregate_by_flow_id(self, tenant_id: str, namespace: str, flow_id: str, task_id: str, metric: str, start_date: datetime, end_date: datetime, aggregation: str) -> MetricAggregations:
        raise NotImplementedError  # TODO: translate from Java

    def purge(self, execution: Execution) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def purge(self, executions: list[Execution]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def default_filter(self, tenant_id: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def default_filter(self) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def query_distinct(self, tenant_id: str, condition: Condition, field: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def aggregate(self, tenant_id: str, condition: Condition, start_date: datetime, end_date: datetime, aggregation: str) -> list[MetricAggregation]:
        raise NotImplementedError  # TODO: translate from Java

    def aggregate(self, aggregation: str) -> Field[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def fill_date(self, result: list[MetricAggregation], start_date: datetime, end_date: datetime) -> list[MetricAggregation]:
        raise NotImplementedError  # TODO: translate from Java

    def fill_date(self, result: list[MetricAggregation], start_date: datetime, end_date: datetime, unit: ChronoUnit, format: str) -> list[MetricAggregation]:
        raise NotImplementedError  # TODO: translate from Java

    def sort_mapping(self) -> Function[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_value(self, tenant_id: str, data_filter: DataFilterKPI[Metrics.Fields, Any], start_date: datetime, end_date: datetime, numerator_filter: bool) -> float:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_data(self, tenant_id: str, descriptors: DataFilter[Metrics.Fields, Any], start_date: datetime, end_date: datetime, pageable: Pageable) -> ArrayListTotal[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        ...
