from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\TaskRun.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.tasks.retrys.abstract_retry import AbstractRetry
from engine.core.models.assets.assets_in_out import AssetsInOut
from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.resolved_task import ResolvedTask
from engine.core.models.flows.state import State
from engine.core.models.executions.task_run_attempt import TaskRunAttempt
from engine.core.models.tenant_interface import TenantInterface
from engine.core.models.flows.type import Type
from engine.core.models.executions.variables import Variables


@dataclass(slots=True, kw_only=True)
class TaskRun:
    id: str
    execution_id: str
    namespace: str
    flow_id: str
    task_id: str
    state: State
    tenant_id: str | None = None
    parent_task_run_id: str | None = None
    value: str | None = None
    attempts: list[TaskRunAttempt] | None = None
    outputs: Variables | None = None
    assets: AssetsInOut | None = None
    iteration: int | None = None
    dynamic: bool | None = None
    force_execution: bool | None = None

    def with_state(self, state: State.Type) -> TaskRun:
        raise NotImplementedError  # TODO: translate from Java

    def with_state_and_attempt(self, state: State.Type) -> TaskRun:
        raise NotImplementedError  # TODO: translate from Java

    def fail(self) -> TaskRun:
        raise NotImplementedError  # TODO: translate from Java

    def for_child_execution(self, remap_task_run_id: dict[str, str], execution_id: str, state: State) -> TaskRun:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(execution: Execution, resolved_task: ResolvedTask) -> TaskRun:
        raise NotImplementedError  # TODO: translate from Java

    def attempt_number(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def last_attempt(self) -> TaskRunAttempt:
        raise NotImplementedError  # TODO: translate from Java

    def on_running_resend(self) -> TaskRun:
        raise NotImplementedError  # TODO: translate from Java

    def is_same(self, task_run: TaskRun) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self, pretty: bool) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_string_state(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def next_retry_date(self, retry: AbstractRetry, execution: Execution) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def next_retry_date(self, retry: AbstractRetry) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def should_be_retried(self, retry: AbstractRetry) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def increment_iteration(self) -> TaskRun:
        raise NotImplementedError  # TODO: translate from Java

    def reset_attempts(self) -> TaskRun:
        raise NotImplementedError  # TODO: translate from Java

    def add_attempt(self, attempt: TaskRunAttempt) -> TaskRun:
        raise NotImplementedError  # TODO: translate from Java
