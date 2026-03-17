from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\MetricController.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.executions.metrics.metric_aggregations import MetricAggregations
from engine.core.models.executions.metric_entry import MetricEntry
from engine.core.repositories.metric_repository_interface import MetricRepositoryInterface
from engine.webserver.responses.paged_results import PagedResults
from engine.core.queues.queue_interface import QueueInterface
from engine.core.tenant.tenant_service import TenantService


@dataclass(slots=True, kw_only=True)
class MetricController:
    metrics_repository: MetricRepositoryInterface | None = None
    metric_queue: QueueInterface[MetricEntry] | None = None
    tenant_service: TenantService | None = None

    def search_by_execution(self, page: int, size: int, sort: list[str], execution_id: str, task_run_id: str, task_id: str) -> PagedResults[MetricEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def list_flow_metrics(self, namespace: str, flow_id: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def list_task_metrics(self, namespace: str, flow_id: str, task_id: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def list_tasks_with_metrics(self, namespace: str, flow_id: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def aggregate_metrics_from_flow(self, namespace: str, flow_id: str, metric: str, start_date: datetime, end_date: datetime, aggregation: str) -> MetricAggregations:
        raise NotImplementedError  # TODO: translate from Java

    def aggregate_metrics_from_task(self, namespace: str, flow_id: str, task_id: str, metric: str, start_date: datetime, end_date: datetime, aggregation: str) -> MetricAggregations:
        raise NotImplementedError  # TODO: translate from Java
