from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\metrics\MetricRegistry.java
# WARNING: Unresolved types: DistributionSummary, MeterBinder, MeterRegistry, Number, Search, T, Tags

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.executions.metrics.counter import Counter
from engine.core.models.executions.execution import Execution
from engine.core.models.executions.execution_killed import ExecutionKilled
from engine.core.models.executions.metrics.gauge import Gauge
from engine.core.models.label import Label
from engine.core.metrics.metric_config import MetricConfig
from engine.core.runners.subflow_execution_result import SubflowExecutionResult
from engine.core.models.tasks.task import Task
from engine.core.models.executions.metrics.timer import Timer
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.runners.worker_task import WorkerTask
from engine.core.runners.worker_task_result import WorkerTaskResult
from engine.core.runners.worker_trigger import WorkerTrigger


@dataclass(slots=True, kw_only=True)
class MetricRegistry:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    metric_worker_job_pending_count: ClassVar[str] = "worker.job.pending"
    metric_worker_job_pending_count_description: ClassVar[str] = "The number of jobs (tasks or triggers) pending to be run by the Worker"
    metric_worker_job_running_count: ClassVar[str] = "worker.job.running"
    metric_worker_job_running_count_description: ClassVar[str] = "The number of jobs (tasks or triggers) currently running inside the Worker"
    metric_worker_job_thread_count: ClassVar[str] = "worker.job.thread"
    metric_worker_job_thread_count_description: ClassVar[str] = "The number of worker threads"
    metric_worker_running_count: ClassVar[str] = "worker.running.count"
    metric_worker_running_count_description: ClassVar[str] = "The number of tasks currently running inside the Worker"
    metric_worker_queued_duration: ClassVar[str] = "worker.queued.duration"
    metric_worker_queued_duration_description: ClassVar[str] = "Task queued duration inside the Worker"
    metric_worker_started_count: ClassVar[str] = "worker.started.count"
    metric_worker_started_count_description: ClassVar[str] = "The total number of tasks started by the Worker"
    metric_worker_timeout_count: ClassVar[str] = "worker.timeout.count"
    metric_worker_timeout_count_description: ClassVar[str] = "The total number of tasks that timeout inside the Worker"
    metric_worker_ended_count: ClassVar[str] = "worker.ended.count"
    metric_worker_ended_count_description: ClassVar[str] = "The total number of tasks ended by the Worker"
    metric_worker_ended_duration: ClassVar[str] = "worker.ended.duration"
    metric_worker_ended_duration_description: ClassVar[str] = "Task run duration inside the Worker"
    metric_worker_trigger_duration: ClassVar[str] = "worker.trigger.duration"
    metric_worker_trigger_duration_description: ClassVar[str] = "Trigger evaluation duration inside the Worker"
    metric_worker_trigger_running_count: ClassVar[str] = "worker.trigger.running.count"
    metric_worker_trigger_running_count_description: ClassVar[str] = "The number of triggers currently evaluating inside the Worker"
    metric_worker_trigger_started_count: ClassVar[str] = "worker.trigger.started.count"
    metric_worker_trigger_started_count_description: ClassVar[str] = "The total number of trigger evaluations started by the Worker"
    metric_worker_trigger_ended_count: ClassVar[str] = "worker.trigger.ended.count"
    metric_worker_trigger_ended_count_description: ClassVar[str] = "The total number of trigger evaluations ended by the Worker"
    metric_worker_trigger_error_count: ClassVar[str] = "worker.trigger.error.count"
    metric_worker_trigger_error_count_description: ClassVar[str] = "The total number of trigger evaluations that failed inside the Worker"
    metric_worker_trigger_execution_count: ClassVar[str] = "worker.trigger.execution.count"
    metric_worker_trigger_execution_count_description: ClassVar[str] = "The total number of triggers evaluated by the Worker"
    metric_worker_killed_count: ClassVar[str] = "worker.killed.count"
    metric_worker_killed_count_description: ClassVar[str] = "The total number of executions killed events received the Executor"
    metric_executor_thread_count: ClassVar[str] = "executor.thread.count"
    metric_executor_thread_count_description: ClassVar[str] = "The number of executor threads"
    metric_executor_taskrun_created_count: ClassVar[str] = "executor.taskrun.created.count"
    metric_executor_taskrun_created_count_description: ClassVar[str] = "The total number of tasks created by the Executor"
    metric_executor_taskrun_ended_count: ClassVar[str] = "executor.taskrun.ended.count"
    metric_executor_taskrun_ended_count_description: ClassVar[str] = "The total number of tasks ended by the Executor"
    metric_executor_taskrun_ended_duration: ClassVar[str] = "executor.taskrun.ended.duration"
    metric_executor_taskrun_ended_duration_description: ClassVar[str] = "Task duration inside the Executor"
    metric_executor_flowable_execution_count: ClassVar[str] = "executor.flowable.execution.count"
    metric_executor_flowable_execution_count_description: ClassVar[str] = "The total number of flowable tasks executed by the Executor"
    metric_executor_execution_started_count: ClassVar[str] = "executor.execution.started.count"
    metric_executor_execution_started_count_description: ClassVar[str] = "The total number of executions started by the Executor"
    metric_executor_execution_end_count: ClassVar[str] = "executor.execution.end.count"
    metric_executor_execution_end_count_description: ClassVar[str] = "The total number of executions ended by the Executor"
    metric_executor_execution_duration: ClassVar[str] = "executor.execution.duration"
    metric_executor_execution_duration_description: ClassVar[str] = "Execution duration inside the Executor"
    metric_executor_execution_message_process_duration: ClassVar[str] = "executor.execution.message.process"
    metric_executor_execution_message_process_duration_description: ClassVar[str] = "Duration of a single execution message processed by the Executor"
    metric_executor_killed_count: ClassVar[str] = "executor.killed.count"
    metric_executor_killed_count_description: ClassVar[str] = "The total number of executions killed events received the Executor"
    metric_executor_sla_expired_count: ClassVar[str] = "executor.sla.expired.count"
    metric_executor_sla_expired_count_description: ClassVar[str] = "The total number of expired SLA (i.e. executions with SLA of type MAX_DURATION that took longer than the SLA) evaluated by the Executor"
    metric_executor_sla_violation_count: ClassVar[str] = "executor.sla.violation.count"
    metric_executor_sla_violation_count_description: ClassVar[str] = "The total number of expired SLA (i.e. executions with SLA of type MAX_DURATION that took longer than the SLA) evaluated by the Executor"
    metric_executor_execution_delay_created_count: ClassVar[str] = "executor.execution.delay.created.count"
    metric_executor_execution_delay_created_count_description: ClassVar[str] = "The total number of execution delays created by the Executor"
    metric_executor_execution_delay_ended_count: ClassVar[str] = "executor.execution.delay.ended.count"
    metric_executor_execution_delay_ended_count_description: ClassVar[str] = "The total number of execution delays ended (resumed) by the Executor"
    metric_executor_worker_job_resubmit_count: ClassVar[str] = "executor.worker.job.resubmit.count"
    metric_executor_worker_job_resubmit_count_description: ClassVar[str] = "The total number of worker jobs resubmitted to the Worker by the Executor"
    metric_executor_execution_queued_count: ClassVar[str] = "executor.execution.queued.count"
    metric_executor_execution_queued_count_description: ClassVar[str] = "The total number of executions queued by the Executor"
    metric_executor_execution_popped_count: ClassVar[str] = "executor.execution.popped.count"
    metric_executor_execution_popped_count_description: ClassVar[str] = "The total number of executions popped by the Executor"
    metric_indexer_request_count: ClassVar[str] = "indexer.request.count"
    metric_indexer_request_count_description: ClassVar[str] = "Total number of batches of records received by the Indexer"
    metric_indexer_request_duration: ClassVar[str] = "indexer.request.duration"
    metric_indexer_request_duration_description: ClassVar[str] = "Batch of records duration inside the Indexer"
    metric_indexer_request_retry_count: ClassVar[str] = "indexer.request.retry.count"
    metric_indexer_request_retry_count_description: ClassVar[str] = "Total number of batches of records retried by the Indexer"
    metric_indexer_server_duration: ClassVar[str] = "indexer.server.duration"
    metric_indexer_server_duration_description: ClassVar[str] = "Batch of records indexation duration"
    metric_indexer_message_failed_count: ClassVar[str] = "indexer.message.failed.count"
    metric_indexer_message_failed_count_description: ClassVar[str] = "Total number of records which failed to be indexed by the Indexer"
    metric_indexer_message_in_count: ClassVar[str] = "indexer.message.in.count"
    metric_indexer_message_in_count_description: ClassVar[str] = "Total number of records received by the Indexer"
    metric_indexer_message_out_count: ClassVar[str] = "indexer.message.out.count"
    metric_indexer_message_out_count_description: ClassVar[str] = "Total number of records indexed by the Indexer"
    metric_scheduler_loop_count: ClassVar[str] = "scheduler.loop.count"
    metric_scheduler_loop_count_description: ClassVar[str] = "Total number of evaluation loops executed by the Scheduler"
    metric_scheduler_trigger_evaluation_duration: ClassVar[str] = "scheduler.trigger.evaluation.duration"
    metric_scheduler_trigger_evaluation_duration_description: ClassVar[str] = "Trigger evaluation duration for trigger executed inside the Scheduler (Schedulable triggers)"
    metric_scheduler_trigger_count: ClassVar[str] = "scheduler.trigger.count"
    metric_scheduler_trigger_count_description: ClassVar[str] = "Total number of executions triggered by the Scheduler"
    metric_scheduler_trigger_delay_duration: ClassVar[str] = "scheduler.trigger.delay.duration"
    metric_scheduler_trigger_delay_duration_description: ClassVar[str] = "Trigger delay duration inside the Scheduler"
    metric_scheduler_evaluate_count: ClassVar[str] = "scheduler.evaluate.count"
    metric_scheduler_evaluate_count_description: ClassVar[str] = "Total number of triggers evaluated by the Scheduler"
    metric_scheduler_execution_lock_duration: ClassVar[str] = "scheduler.execution.lock.duration"
    metric_scheduler_execution_lock_duration_description: ClassVar[str] = "Trigger lock duration waiting for an execution to be terminated"
    metric_scheduler_execution_missing_duration: ClassVar[str] = "scheduler.execution.missing.duration"
    metric_scheduler_execution_missing_duration_description: ClassVar[str] = "Missing execution duration inside the Scheduler. A missing execution is an execution that was triggered by the Scheduler but not yet started by the Executor"
    metric_scheduler_evaluation_loop_duration: ClassVar[str] = "scheduler.evaluation.loop.duration"
    metric_scheduler_evaluation_loop_duration_description: ClassVar[str] = "Trigger evaluation loop duration inside the Scheduler"
    metric_streams_state_count: ClassVar[str] = "stream.state.count"
    metric_streams_state_count_description: ClassVar[str] = "Number of Kafka Stream applications by state"
    metric_jdbc_query_duration: ClassVar[str] = "jdbc.query.duration"
    metric_jdbc_query_duration_description: ClassVar[str] = "Duration of database queries"
    metric_queue_big_message_count: ClassVar[str] = "queue.big_message.count"
    metric_queue_big_message_count_description: ClassVar[str] = "Total number of big messages"
    metric_queue_produce_count: ClassVar[str] = "queue.produce.count"
    metric_queue_produce_count_description: ClassVar[str] = "Total number of produced messages"
    metric_queue_receive_duration: ClassVar[str] = "queue.receive.duration"
    metric_queue_receive_duration_description: ClassVar[str] = "Queue duration to receive and consume a batch of messages"
    metric_queue_poll_size: ClassVar[str] = "queue.poll.size"
    metric_queue_poll_size_description: ClassVar[str] = "Size of a poll to the queue (message batch size)"
    tag_task_type: ClassVar[str] = "task_type"
    tag_trigger_type: ClassVar[str] = "trigger_type"
    tag_flow_id: ClassVar[str] = "flow_id"
    tag_namespace_id: ClassVar[str] = "namespace_id"
    tag_state: ClassVar[str] = "state"
    tag_attempt_count: ClassVar[str] = "attempt_count"
    tag_worker_group: ClassVar[str] = "worker_group"
    tag_tenant_id: ClassVar[str] = "tenant_id"
    tag_class_name: ClassVar[str] = "class_name"
    tag_execution_killed_type: ClassVar[str] = "execution_killed_type"
    tag_queue_consumer: ClassVar[str] = "consumer"
    tag_queue_consumer_group: ClassVar[str] = "consumer_group"
    tag_queue_type: ClassVar[str] = "queue_type"
    tag_label_prefix: ClassVar[str] = "label"
    tag_label_placeholder: ClassVar[str] = "__none__"
    meter_registry: MeterRegistry | None = None
    metric_config: MetricConfig | None = None

    def counter(self, name: str, description: str) -> Counter:
        raise NotImplementedError  # TODO: translate from Java

    def gauge(self, name: str, description: str, number: T) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def timer(self, name: str, description: str) -> Timer:
        raise NotImplementedError  # TODO: translate from Java

    def summary(self, name: str, description: str) -> DistributionSummary:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, name: str) -> Search:
        raise NotImplementedError  # TODO: translate from Java

    def find_counter(self, name: str) -> Counter:
        raise NotImplementedError  # TODO: translate from Java

    def find_gauge(self, name: str) -> Gauge:
        raise NotImplementedError  # TODO: translate from Java

    def find_timer(self, name: str) -> Timer:
        raise NotImplementedError  # TODO: translate from Java

    def find_distribution_summary(self, name: str) -> DistributionSummary:
        raise NotImplementedError  # TODO: translate from Java

    def metric_name(self, name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self, worker_task: WorkerTask, worker_group: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self, worker_trigger: WorkerTrigger, worker_group: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self, worker_task_result: WorkerTaskResult) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self, subflow_execution_result: SubflowExecutionResult) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self, task: Task) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self, trigger: AbstractTrigger) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self, execution: Execution) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self, trigger_context: TriggerContext) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self, execution_killed: ExecutionKilled) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self) -> Tags:
        raise NotImplementedError  # TODO: translate from Java

    def bind(self, meter_binder: MeterBinder) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_tenant_tag(self, tenant_id: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_label_tags(self, labels: list[Label]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java
