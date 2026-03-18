from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\LogEntry.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.executions.execution import Execution
from engine.core.models.executions.execution_kind import ExecutionKind
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.tenant_interface import TenantInterface
from engine.core.models.triggers.trigger_context import TriggerContext


@dataclass(frozen=True, slots=True, kw_only=True)
class LogEntry:
    namespace: str
    flow_id: str
    tenant_id: str | None = None
    task_id: str | None = None
    execution_id: str | None = None
    task_run_id: str | None = None
    attempt_number: int | None = None
    trigger_id: str | None = None
    timestamp: datetime | None = None
    level: int | None = None
    thread: str | None = None
    message: str | None = None
    execution_kind: ExecutionKind | None = None

    @staticmethod
    def find_levels_by_min(min_level: int) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(task_run: TaskRun, execution_kind: ExecutionKind | None = None) -> LogEntry:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_pretty_string(log_entry: LogEntry, max_message_size: int | None = None) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_map(self) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def to_log_map(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
