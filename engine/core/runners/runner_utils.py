from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunnerUtils.java
# WARNING: Unresolved types: BiFunction, Predicate, Runnable, TimeoutException

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar

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
    d_e_f_a_u_l_t__m_a_x__w_a_i_t__d_u_r_a_t_i_o_n: ClassVar[timedelta] = Duration.ofSeconds(15)
    execution_queue: QueueInterface[Execution] | None = None
    flow_repository: FlowRepositoryInterface | None = None
    execution_service: ExecutionService | None = None

    def run_one(self, tenant_id: str, namespace: str, flow_id: str) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one(self, tenant_id: str, namespace: str, flow_id: str, revision: int) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one(self, tenant_id: str, namespace: str, flow_id: str, revision: int, inputs: BiFunction[FlowInterface, Execution, dict[str, Any]]) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one(self, tenant_id: str, namespace: str, flow_id: str, duration: timedelta) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one(self, tenant_id: str, namespace: str, flow_id: str, revision: int, inputs: BiFunction[FlowInterface, Execution, dict[str, Any]], duration: timedelta) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one(self, tenant_id: str, namespace: str, flow_id: str, revision: int, inputs: BiFunction[FlowInterface, Execution, dict[str, Any]], duration: timedelta, labels: list[Label]) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one(self, flow: Flow, inputs: BiFunction[FlowInterface, Execution, dict[str, Any]]) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one(self, flow: Flow, inputs: BiFunction[FlowInterface, Execution, dict[str, Any]], duration: timedelta) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one(self, flow: Flow, inputs: BiFunction[FlowInterface, Execution, dict[str, Any]], duration: timedelta, labels: list[Label]) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one(self, execution: Execution, flow: Flow, duration: timedelta) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one_until_paused(self, tenant_id: str, namespace: str, flow_id: str) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one_until_paused(self, tenant_id: str, namespace: str, flow_id: str, revision: int, inputs: BiFunction[FlowInterface, Execution, dict[str, Any]], duration: timedelta) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one_until_paused(self, flow: Flow, inputs: BiFunction[FlowInterface, Execution, dict[str, Any]], duration: timedelta) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one_until_running(self, tenant_id: str, namespace: str, flow_id: str) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one_until_running(self, tenant_id: str, namespace: str, flow_id: str, revision: int, inputs: BiFunction[FlowInterface, Execution, dict[str, Any]], duration: timedelta) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def run_one_until_running(self, flow: Flow, inputs: BiFunction[FlowInterface, Execution, dict[str, Any]], duration: timedelta) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def await_execution(self, predicate: Predicate[Execution], execution_emitter: Runnable, duration: timedelta) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def await_child_execution(self, flow: Flow, parent_execution: Execution, execution_emitter: Runnable, duration: timedelta) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminated_execution(self, execution: Execution, flow: Flow) -> Predicate[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def is_paused_execution(self, execution: Execution) -> Predicate[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def is_running_execution(self, execution: Execution) -> Predicate[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminated_child_execution(self, parent_execution: Execution, flow: Flow) -> Predicate[Execution]:
        raise NotImplementedError  # TODO: translate from Java
