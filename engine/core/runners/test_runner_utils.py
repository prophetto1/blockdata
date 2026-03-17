from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\runners\TestRunnerUtils.java

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, Callable, ClassVar

from engine.core.models.executions.execution import Execution
from engine.core.models.executions.execution_killed import ExecutionKilled
from engine.core.models.executions.execution_kind import ExecutionKind
from engine.core.repositories.execution_repository_interface import ExecutionRepositoryInterface
from engine.core.services.execution_service import ExecutionService
from engine.core.models.flows.flow import Flow
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.label import Label
from engine.core.queues.queue_exception import QueueException
from engine.core.queues.queue_interface import QueueInterface


@dataclass(slots=True, kw_only=True)
class TestRunnerUtils:
    default_max_wait_duration: ClassVar[timedelta]
    execution_queue: QueueInterface[Execution] | None = None
    kill_queue: QueueInterface[ExecutionKilled] | None = None
    flow_repository: FlowRepositoryInterface | None = None
    execution_repository: ExecutionRepositoryInterface | None = None
    execution_service: ExecutionService | None = None

    def run_one(self, tenant_id: str, namespace: str, flow_id: str | None = None, revision: int | None = None, inputs: Callable[FlowInterface, Execution, dict[str, Any]] | None = None, duration: timedelta | None = None, labels: list[Label] | None = None, execution_kind: ExecutionKind | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one_until_paused(self, tenant_id: str, namespace: str, flow_id: str, revision: int | None = None, inputs: Callable[FlowInterface, Execution, dict[str, Any]] | None = None, duration: timedelta | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one_until_running(self, tenant_id: str, namespace: str, flow_id: str, revision: int | None = None, inputs: Callable[FlowInterface, Execution, dict[str, Any]] | None = None, duration: timedelta | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one_until(self, tenant_id: str, namespace: str, flow_id: str, revision: int, inputs: Callable[FlowInterface, Execution, dict[str, Any]] | None = None, duration: timedelta | None = None, predicate: Callable[Execution] | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def emit_and_await_execution(self, predicate: Callable[Execution], execution: Execution, duration: timedelta | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def restart_execution(self, predicate: Callable[Execution], execution: Execution, duration: timedelta | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def await_execution(self, predicate: Callable[Execution], execution: Execution, duration: timedelta | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def await_flow_execution(self, predicate: Callable[Execution], tenant_id: str, namespace: str, flow_id: str, duration: timedelta | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def await_flow_execution_number(self, number: int, tenant_id: str, namespace: str, flow_id: str, duration: timedelta | None = None) -> list[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def kill_execution(self, execution: Execution) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def await_child_execution(self, flow: Flow, parent_execution: Execution, execution: Execution, duration: timedelta) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminated_execution(self, execution: Execution, flow: Flow) -> Callable[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def is_paused_execution(self, execution: Execution) -> Callable[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def is_running_execution(self, execution: Execution) -> Callable[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminated_child_execution(self, parent_execution: Execution, flow: Flow) -> Callable[Execution]:
        raise NotImplementedError  # TODO: translate from Java
