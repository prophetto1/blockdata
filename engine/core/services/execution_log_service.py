from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\ExecutionLogService.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.executions.log_entry import LogEntry
from engine.core.repositories.log_repository_interface import LogRepositoryInterface


@dataclass(slots=True, kw_only=True)
class ExecutionLogService:
    log_repository: LogRepositoryInterface | None = None

    def purge(self, tenant_id: str, namespace: str, flow_id: str, execution_id: str, log_levels: list[int], start_date: datetime, end_date: datetime) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def error_logs(self, tenant_id: str, execution_id: str) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def get_execution_logs_as_stream(self, tenant_id: str, execution_id: str, min_level: int, task_run_id: str, task_ids: list[str], attempt: int, with_access_control: bool) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_execution_logs(self, tenant_id: str, execution_id: str, min_level: int, task_run_id: str, task_ids: list[str], attempt: int | None = None, with_access_control: bool | None = None) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java
