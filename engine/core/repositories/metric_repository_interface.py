from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\MetricRepositoryInterface.java

from datetime import datetime
from typing import Any, Callable, Protocol

from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.executions.execution import Execution
from engine.core.models.executions.metrics.metric_aggregations import MetricAggregations
from engine.core.models.executions.metric_entry import MetricEntry
from engine.plugin.core.dashboard.data.metrics import Metrics
from engine.core.repositories.query_builder_interface import QueryBuilderInterface
from engine.core.repositories.save_repository_interface import SaveRepositoryInterface


class MetricRepositoryInterface(SaveRepositoryInterface, QueryBuilderInterface, Protocol):
    def find_by_execution_id(self, tenant_id: str, id: str, pageable: Pageable) -> ArrayListTotal[MetricEntry]: ...

    def find_by_execution_id_and_task_id(self, tenant_id: str, execution_id: str, task_id: str, pageable: Pageable) -> ArrayListTotal[MetricEntry]: ...

    def find_by_execution_id_and_task_run_id(self, tenant_id: str, execution_id: str, task_run_id: str, pageable: Pageable) -> ArrayListTotal[MetricEntry]: ...

    def flow_metrics(self, tenant_id: str, namespace: str, flow_id: str) -> list[str]: ...

    def task_metrics(self, tenant_id: str, namespace: str, flow_id: str, task_id: str) -> list[str]: ...

    def tasks_with_metrics(self, tenant_id: str, namespace: str, flow_id: str) -> list[str]: ...

    def aggregate_by_flow_id(self, tenant_id: str, namespace: str, flow_id: str, task_id: str, metric: str, start_date: datetime, end_date: datetime, aggregation: str) -> MetricAggregations: ...

    def purge(self, execution: Execution) -> int: ...

    def find_all_async(self, tenant_id: str) -> Flux[MetricEntry]: ...

    def sort_mapping(self) -> Callable[str, str]: ...
