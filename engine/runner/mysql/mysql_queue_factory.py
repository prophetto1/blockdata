from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\runner\mysql\MysqlQueueFactory.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.executions.execution_killed import ExecutionKilled
from engine.core.runners.executor import Executor
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.executions.log_entry import LogEntry
from engine.core.models.executions.metric_entry import MetricEntry
from engine.core.runners.multiple_condition_event import MultipleConditionEvent
from engine.core.queues.queue_factory_interface import QueueFactoryInterface
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


@dataclass(slots=True, kw_only=True)
class MysqlQueueFactory:
    application_context: ApplicationContext | None = None

    def execution(self) -> QueueInterface[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def executor(self) -> QueueInterface[Executor]:
        raise NotImplementedError  # TODO: translate from Java

    def worker_job(self) -> WorkerJobQueueInterface:
        raise NotImplementedError  # TODO: translate from Java

    def worker_task_result(self) -> QueueInterface[WorkerTaskResult]:
        raise NotImplementedError  # TODO: translate from Java

    def worker_trigger_result(self) -> QueueInterface[WorkerTriggerResult]:
        raise NotImplementedError  # TODO: translate from Java

    def log_entry(self) -> QueueInterface[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def metric_entry(self) -> QueueInterface[MetricEntry]:
        raise NotImplementedError  # TODO: translate from Java

    def flow(self) -> QueueInterface[FlowInterface]:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> QueueInterface[ExecutionKilled]:
        raise NotImplementedError  # TODO: translate from Java

    def template(self) -> QueueInterface[Template]:
        raise NotImplementedError  # TODO: translate from Java

    def worker_instance(self) -> QueueInterface[WorkerInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def worker_job_running(self) -> QueueInterface[WorkerJobRunning]:
        raise NotImplementedError  # TODO: translate from Java

    def trigger(self) -> QueueInterface[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def subflow_execution_result(self) -> QueueInterface[SubflowExecutionResult]:
        raise NotImplementedError  # TODO: translate from Java

    def subflow_execution_end(self) -> QueueInterface[SubflowExecutionEnd]:
        raise NotImplementedError  # TODO: translate from Java

    def multiple_condition_event(self) -> QueueInterface[MultipleConditionEvent]:
        raise NotImplementedError  # TODO: translate from Java
