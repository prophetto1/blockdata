from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunnerUtils.java

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, Callable, ClassVar

from engine.core.models.executions.execution import Execution
from engine.core.services.execution_service import ExecutionService
from engine.core.models.flows.flow import Flow
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.label import Label
from engine.core.queues.queue_exception import QueueException
from engine.core.queues.queue_interface import QueueInterface


@dataclass(slots=True, kw_only=True)
class RunnerUtils:
    default_max_wait_duration: ClassVar[timedelta]
    execution_queue: QueueInterface[Execution] | None = None
    flow_repository: FlowRepositoryInterface | None = None
    execution_service: ExecutionService | None = None

    def run_one(self, tenant_id: str, namespace: str, flow_id: str | None = None, revision: int | None = None, inputs: Callable[FlowInterface, Execution, dict[str, Any]] | None = None, duration: timedelta | None = None, labels: list[Label] | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one_until_paused(self, tenant_id: str, namespace: str, flow_id: str, revision: int | None = None, inputs: Callable[FlowInterface, Execution, dict[str, Any]] | None = None, duration: timedelta | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one_until_running(self, tenant_id: str, namespace: str, flow_id: str, revision: int | None = None, inputs: Callable[FlowInterface, Execution, dict[str, Any]] | None = None, duration: timedelta | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def await_execution(self, predicate: Callable[Execution], execution_emitter: Callable, duration: timedelta) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def await_child_execution(self, flow: Flow, parent_execution: Execution, execution_emitter: Callable, duration: timedelta) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminated_execution(self, execution: Execution, flow: Flow) -> Callable[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def is_paused_execution(self, execution: Execution) -> Callable[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def is_running_execution(self, execution: Execution) -> Callable[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminated_child_execution(self, parent_execution: Execution, flow: Flow) -> Callable[Execution]:
        raise NotImplementedError  # TODO: translate from Java
