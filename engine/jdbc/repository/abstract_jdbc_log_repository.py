from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcLogRepository.java
# WARNING: Unresolved types: Date, Field, Fields, Flux, GroupType, Level, Pageable, io, jdbc, kestra

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
from engine.core.models.dashboards.data_filter_kpi import DataFilterKPI
from engine.core.utils.date_utils import DateUtils
from engine.core.models.executions.execution import Execution
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.core.models.executions.log_entry import LogEntry
from engine.core.repositories.log_repository_interface import LogRepositoryInterface
from engine.plugin.core.dashboard.data.logs import Logs
from engine.core.models.query_filter import QueryFilter


@dataclass(slots=True, kw_only=True)
class AbstractJdbcLogRepository(ABC, AbstractJdbcCrudRepository):
    normal_kind_condition: ClassVar[Condition]
    date_column: ClassVar[str] = "timestamp"
    filter_service: JdbcFilterService | None = None

    @abstractmethod
    def find_condition(self, query: str) -> Condition:
        ...

    def find_query_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def get_fields_mapping(self) -> dict[Logs.Fields, str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_where_mapping(self) -> dict[Logs.Fields, str]:
        raise NotImplementedError  # TODO: translate from Java

    def date_fields(self) -> set[Logs.Fields]:
        raise NotImplementedError  # TODO: translate from Java

    def date_filter_field(self) -> Logs.Fields:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, pageable: Pageable, tenant_id: str, filters: list[QueryFilter]) -> ArrayListTotal[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_async(self, tenant_id: str, filters: list[QueryFilter]) -> Flux[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id(self, tenant_id: str, execution_id: str, min_level: Level) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_without_acl(self, tenant_id: str, execution_id: str, min_level: Level) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id(self, tenant_id: str, execution_id: str, min_level: Level, with_access_control: bool) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id(self, tenant_id: str, execution_id: str, min_level: Level, pageable: Pageable) -> ArrayListTotal[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id(self, tenant_id: str, namespace: str, flow_id: str, execution_id: str, min_level: Level) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_id(self, tenant_id: str, execution_id: str, task_id: str, min_level: Level) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_id_without_acl(self, tenant_id: str, execution_id: str, task_id: str, min_level: Level) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_id(self, tenant_id: str, execution_id: str, task_id: str, min_level: Level, with_access_control: bool) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_id(self, tenant_id: str, execution_id: str, task_id: str, min_level: Level, pageable: Pageable) -> ArrayListTotal[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_id(self, tenant_id: str, namespace: str, flow_id: str, execution_id: str, task_id: str, min_level: Level) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_run_id(self, tenant_id: str, execution_id: str, task_run_id: str, min_level: Level) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_run_id_without_acl(self, tenant_id: str, execution_id: str, task_run_id: str, min_level: Level) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_run_id(self, tenant_id: str, execution_id: str, task_run_id: str, min_level: Level, with_access_control: bool) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_run_id(self, tenant_id: str, execution_id: str, task_run_id: str, min_level: Level, pageable: Pageable) -> ArrayListTotal[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_run_id_and_attempt(self, tenant_id: str, execution_id: str, task_run_id: str, min_level: Level, attempt: int) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_run_id_and_attempt_without_acl(self, tenant_id: str, execution_id: str, task_run_id: str, min_level: Level, attempt: int) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_run_id_and_attempt(self, tenant_id: str, execution_id: str, task_run_id: str, min_level: Level, attempt: int, with_access_control: bool) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_execution_id_and_task_run_id_and_attempt(self, tenant_id: str, execution_id: str, task_run_id: str, min_level: Level, attempt: int, pageable: Pageable) -> ArrayListTotal[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def purge(self, execution: Execution) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def purge(self, executions: list[Execution]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_query(self, tenant_id: str, execution_id: str, task_id: str, task_run_id: str, min_level: Level, attempt: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_query(self, tenant_id: str, namespace: str, flow_id: str, trigger_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_query(self, tenant_id: str, namespace: str, flow_id: str, execution_id: str, log_levels: list[Level], start_date: datetime, end_date: datetime) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_filters(self, tenant_id: str, filters: list[QueryFilter]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def query(self, tenant_id: str, condition: Condition, min_level: Level, pageable: Pageable) -> ArrayListTotal[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def query(self, tenant_id: str, condition: Condition, min_level: Level, with_access_control: bool) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def min_level(self, min_level: Level) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def levels_condition(self, levels: list[Level]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_value(self, tenant_id: str, data_filter: DataFilterKPI[Logs.Fields, Any], start_date: datetime, end_date: datetime, numerator_filter: bool) -> float:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_data(self, tenant_id: str, descriptors: DataFilter[Logs.Fields, Any], start_date: datetime, end_date: datetime, pageable: Pageable) -> ArrayListTotal[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def default_filter(self, tenant_id: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def default_filter(self) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        ...
