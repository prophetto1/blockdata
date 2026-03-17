from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\ExecutionRepositoryInterface.java

from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from typing import Any, Callable, Optional, Protocol

from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.executions.statistics.daily_execution_statistics import DailyExecutionStatistics
from engine.core.utils.date_utils import DateUtils
from engine.core.models.executions.execution import Execution
from engine.core.models.executions.statistics.execution_count import ExecutionCount
from engine.plugin.core.dashboard.data.executions import Executions
from engine.core.models.executions.statistics.flow import Flow
from engine.core.models.flows.flow_scope import FlowScope
from engine.core.repositories.query_builder_interface import QueryBuilderInterface
from engine.core.models.query_filter import QueryFilter
from engine.core.repositories.save_repository_interface import SaveRepositoryInterface
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


class ExecutionRepositoryInterface(SaveRepositoryInterface, QueryBuilderInterface, Protocol):
    def find_by_id(self, tenant_id: str, id: str, allow_deleted: bool | None = None) -> Optional[Execution]: ...

    def find_by_id_without_acl(self, tenant_id: str, id: str) -> Optional[Execution]: ...

    def find_by_flow_id(self, tenant_id: str, namespace: str, id: str, pageable: Pageable) -> ArrayListTotal[Execution]: ...

    def find_all_by_trigger_execution_id(self, tenant_id: str, trigger_execution_id: str) -> Flux[Execution]: ...

    def find_latest_for_states(self, tenant_id: str, namespace: str, flow_id: str, states: list[State.Type]) -> Optional[Execution]: ...

    def find(self, query: str, tenant_id: str, scope: list[FlowScope], namespace: str | None = None, flow_id: str | None = None, start_date: datetime | None = None, end_date: datetime | None = None, state: list[State.Type] | None = None, labels: dict[str, str] | None = None, trigger_execution_id: str | None = None, child_filter: ChildFilter | None = None, allow_deleted: bool | None = None) -> Flux[Execution]: ...

    def find_all_async(self, tenant_id: str) -> Flux[Execution]: ...

    def find_async(self, tenant_id: str, filters: list[QueryFilter]) -> Flux[Execution]: ...

    def delete(self, execution: Execution) -> Execution: ...

    def purge(self, execution: Execution) -> int: ...

    def daily_statistics_for_all_tenants(self, query: str, namespace: str, flow_id: str, start_date: datetime, end_date: datetime, group_by: DateUtils.GroupType) -> list[DailyExecutionStatistics]: ...

    def daily_statistics(self, query: str, tenant_id: str, scope: list[FlowScope], namespace: str, flow_id: str, start_date: datetime, end_date: datetime, group_by: DateUtils.GroupType, state: list[State.Type]) -> list[DailyExecutionStatistics]: ...

    def execution_counts(self, tenant_id: str, flows: list[Flow], states: list[State.Type], start_date: datetime, end_date: datetime, namespaces: list[str]) -> list[ExecutionCount]: ...

    def save(self, execution: Execution) -> Execution: ...

    def update(self, execution: Execution) -> Execution: ...

    def sort_mapping(self) -> Callable[str, str]: ...

    def last_executions(self, tenant_id: str, flows: list[FlowFilter]) -> list[Execution]: ...
