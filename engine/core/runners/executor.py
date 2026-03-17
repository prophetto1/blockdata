from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\Executor.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.runners.execution_delay import ExecutionDelay
from engine.core.models.executions.execution_killed_execution import ExecutionKilledExecution
from engine.core.runners.execution_resumed import ExecutionResumed
from engine.core.runners.execution_running import ExecutionRunning
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.models.has_u_i_d import HasUID
from engine.core.models.flows.state import State
from engine.core.runners.subflow_execution import SubflowExecution
from engine.core.runners.subflow_execution_end import SubflowExecutionEnd
from engine.core.runners.subflow_execution_result import SubflowExecutionResult
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.flows.type import Type
from engine.core.runners.worker_job import WorkerJob
from engine.core.runners.worker_task import WorkerTask
from engine.core.runners.worker_task_result import WorkerTaskResult
from engine.core.runners.worker_trigger import WorkerTrigger


@dataclass(slots=True, kw_only=True)
class Executor:
    from: list[str] = field(default_factory=list)
    execution_updated: bool = False
    nexts: list[TaskRun] = field(default_factory=list)
    worker_tasks: list[WorkerTask] = field(default_factory=list)
    execution_delays: list[ExecutionDelay] = field(default_factory=list)
    subflow_executions: list[SubflowExecution[Any]] = field(default_factory=list)
    subflow_execution_results: list[SubflowExecutionResult] = field(default_factory=list)
    worker_triggers: list[WorkerTrigger] = field(default_factory=list)
    seq_id: int = 0
    execution: Execution | None = None
    exception: Exception | None = None
    offset: int | None = None
    flow: FlowWithSource | None = None
    joined_worker_task_result: WorkerTaskResult | None = None
    joined_subflow_execution_result: SubflowExecutionResult | None = None
    execution_running: ExecutionRunning | None = None
    execution_resumed: ExecutionResumed | None = None
    joined_execution_resumed: ExecutionResumed | None = None
    worker_job_to_resubmit: WorkerJob | None = None
    original_state: State.Type | None = None
    subflow_execution_end: SubflowExecutionEnd | None = None
    joined_subflow_execution_end: SubflowExecutionEnd | None = None
    execution_killed: list[ExecutionKilledExecution] | None = None

    def can_be_processed(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def with_flow(self, flow: FlowWithSource) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def with_execution(self, execution: Execution, from: str) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def with_exception(self, exception: Exception, from: str) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def with_task_run(self, task_runs: list[TaskRun], from: str) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def with_worker_tasks(self, worker_tasks: list[WorkerTask], from: str) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def with_worker_triggers(self, worker_triggers: list[WorkerTrigger], from: str) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def with_worker_task_delays(self, execution_delays: list[ExecutionDelay], from: str) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def with_subflow_executions(self, subflow_executions: list[SubflowExecution[Any]], from: str) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def with_subflow_execution_results(self, subflow_execution_results: list[SubflowExecutionResult], from: str) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def with_execution_running(self, execution_running: ExecutionRunning) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def with_execution_resumed(self, execution_resumed: ExecutionResumed) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def with_execution_killed(self, execution_killed: list[ExecutionKilledExecution]) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def with_subflow_execution_end(self, subflow_execution_end: SubflowExecutionEnd) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def serialize(self) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def increment_and_get_seq_id(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
