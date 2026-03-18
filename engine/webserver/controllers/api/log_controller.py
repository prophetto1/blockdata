from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\LogController.java
# WARNING: Unresolved types: StreamedFile

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.webserver.models.events.event import Event
from engine.core.services.execution_log_service import ExecutionLogService
from engine.core.services.execution_service import ExecutionService
from engine.core.models.executions.log_entry import LogEntry
from engine.core.repositories.log_repository_interface import LogRepositoryInterface
from engine.core.services.log_streaming_service import LogStreamingService
from engine.webserver.responses.paged_results import PagedResults
from engine.core.models.query_filter import QueryFilter
from engine.core.tenant.tenant_service import TenantService


@dataclass(slots=True, kw_only=True)
class LogController:
    log_repository: LogRepositoryInterface | None = None
    log_service: ExecutionLogService | None = None
    tenant_service: TenantService | None = None
    log_streaming_service: LogStreamingService | None = None
    execution_service: ExecutionService | None = None

    def search_logs(self, page: int, size: int, sort: list[str], filters: list[QueryFilter], query: str, namespace: str, flow_id: str, trigger_id: str, min_level: int, start_date: datetime, end_date: datetime) -> PagedResults[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def list_logs_from_execution(self, execution_id: str, min_level: int, task_run_id: str, task_id: str, attempt: int) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def download_logs_from_execution(self, execution_id: str, min_level: int, task_run_id: str, task_id: str, attempt: int) -> HttpResponse[StreamedFile]:
        raise NotImplementedError  # TODO: translate from Java

    def follow_logs_from_execution(self, execution_id: str, min_level: int) -> Flux[Event[LogEntry]]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_logs_from_execution(self, execution_id: str, min_level: int, task_run_id: str, task_id: str, attempt: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_logs_from_flow(self, namespace: str, flow_id: str, trigger_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java
