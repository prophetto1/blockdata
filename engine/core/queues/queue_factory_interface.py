from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\queues\QueueFactoryInterface.java

from typing import Any, Protocol

from engine.core.models.executions.execution import Execution
from engine.core.models.executions.execution_killed import ExecutionKilled
from engine.core.runners.executor import Executor
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.executions.log_entry import LogEntry
from engine.core.models.executions.metric_entry import MetricEntry
from engine.core.runners.multiple_condition_event import MultipleConditionEvent
from engine.core.queues.queue_interface import QueueInterface
from engine.core.runners.subflow_execution_end import SubflowExecutionEnd
from engine.core.runners.subflow_execution_result import SubflowExecutionResult
from engine.core.models.templates.template import Template
from engine.core.models.triggers.trigger import Trigger
from engine.core.runners.worker_instance import WorkerInstance
from engine.core.queues.worker_job_queue_interface import WorkerJobQueueInterface
from engine.core.runners.worker_job_running import WorkerJobRunning
from engine.core.runners.worker_task_result import WorkerTaskResult
from engine.core.runners.worker_trigger_result import WorkerTriggerResult


class QueueFactoryInterface(Protocol):
    def execution(self) -> QueueInterface[Execution]: ...

    def executor(self) -> QueueInterface[Executor]: ...

    def worker_job(self) -> WorkerJobQueueInterface: ...

    def worker_task_result(self) -> QueueInterface[WorkerTaskResult]: ...

    def worker_trigger_result(self) -> QueueInterface[WorkerTriggerResult]: ...

    def log_entry(self) -> QueueInterface[LogEntry]: ...

    def metric_entry(self) -> QueueInterface[MetricEntry]: ...

    def flow(self) -> QueueInterface[FlowInterface]: ...

    def kill(self) -> QueueInterface[ExecutionKilled]: ...

    def template(self) -> QueueInterface[Template]: ...

    def worker_instance(self) -> QueueInterface[WorkerInstance]: ...

    def worker_job_running(self) -> QueueInterface[WorkerJobRunning]: ...

    def trigger(self) -> QueueInterface[Trigger]: ...

    def subflow_execution_result(self) -> QueueInterface[SubflowExecutionResult]: ...

    def subflow_execution_end(self) -> QueueInterface[SubflowExecutionEnd]: ...

    def multiple_condition_event(self) -> QueueInterface[MultipleConditionEvent]: ...
