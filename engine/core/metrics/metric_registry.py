from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\metrics\MetricRegistry.java
# WARNING: Unresolved types: DistributionSummary, MeterBinder, MeterRegistry, Number, Search, T, Tags

from dataclasses import dataclass, field
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
    m_e_t_r_i_c__w_o_r_k_e_r__j_o_b__p_e_n_d_i_n_g__c_o_u_n_t: ClassVar[str] = "worker.job.pending"
    m_e_t_r_i_c__w_o_r_k_e_r__j_o_b__p_e_n_d_i_n_g__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The number of jobs (tasks or triggers) pending to be run by the Worker"
    m_e_t_r_i_c__w_o_r_k_e_r__j_o_b__r_u_n_n_i_n_g__c_o_u_n_t: ClassVar[str] = "worker.job.running"
    m_e_t_r_i_c__w_o_r_k_e_r__j_o_b__r_u_n_n_i_n_g__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The number of jobs (tasks or triggers) currently running inside the Worker"
    m_e_t_r_i_c__w_o_r_k_e_r__j_o_b__t_h_r_e_a_d__c_o_u_n_t: ClassVar[str] = "worker.job.thread"
    m_e_t_r_i_c__w_o_r_k_e_r__j_o_b__t_h_r_e_a_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The number of worker threads"
    m_e_t_r_i_c__w_o_r_k_e_r__r_u_n_n_i_n_g__c_o_u_n_t: ClassVar[str] = "worker.running.count"
    m_e_t_r_i_c__w_o_r_k_e_r__r_u_n_n_i_n_g__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The number of tasks currently running inside the Worker"
    m_e_t_r_i_c__w_o_r_k_e_r__q_u_e_u_e_d__d_u_r_a_t_i_o_n: ClassVar[str] = "worker.queued.duration"
    m_e_t_r_i_c__w_o_r_k_e_r__q_u_e_u_e_d__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Task queued duration inside the Worker"
    m_e_t_r_i_c__w_o_r_k_e_r__s_t_a_r_t_e_d__c_o_u_n_t: ClassVar[str] = "worker.started.count"
    m_e_t_r_i_c__w_o_r_k_e_r__s_t_a_r_t_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of tasks started by the Worker"
    m_e_t_r_i_c__w_o_r_k_e_r__t_i_m_e_o_u_t__c_o_u_n_t: ClassVar[str] = "worker.timeout.count"
    m_e_t_r_i_c__w_o_r_k_e_r__t_i_m_e_o_u_t__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of tasks that timeout inside the Worker"
    m_e_t_r_i_c__w_o_r_k_e_r__e_n_d_e_d__c_o_u_n_t: ClassVar[str] = "worker.ended.count"
    m_e_t_r_i_c__w_o_r_k_e_r__e_n_d_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of tasks ended by the Worker"
    m_e_t_r_i_c__w_o_r_k_e_r__e_n_d_e_d__d_u_r_a_t_i_o_n: ClassVar[str] = "worker.ended.duration"
    m_e_t_r_i_c__w_o_r_k_e_r__e_n_d_e_d__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Task run duration inside the Worker"
    m_e_t_r_i_c__w_o_r_k_e_r__t_r_i_g_g_e_r__d_u_r_a_t_i_o_n: ClassVar[str] = "worker.trigger.duration"
    m_e_t_r_i_c__w_o_r_k_e_r__t_r_i_g_g_e_r__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Trigger evaluation duration inside the Worker"
    m_e_t_r_i_c__w_o_r_k_e_r__t_r_i_g_g_e_r__r_u_n_n_i_n_g__c_o_u_n_t: ClassVar[str] = "worker.trigger.running.count"
    m_e_t_r_i_c__w_o_r_k_e_r__t_r_i_g_g_e_r__r_u_n_n_i_n_g__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The number of triggers currently evaluating inside the Worker"
    m_e_t_r_i_c__w_o_r_k_e_r__t_r_i_g_g_e_r__s_t_a_r_t_e_d__c_o_u_n_t: ClassVar[str] = "worker.trigger.started.count"
    m_e_t_r_i_c__w_o_r_k_e_r__t_r_i_g_g_e_r__s_t_a_r_t_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of trigger evaluations started by the Worker"
    m_e_t_r_i_c__w_o_r_k_e_r__t_r_i_g_g_e_r__e_n_d_e_d__c_o_u_n_t: ClassVar[str] = "worker.trigger.ended.count"
    m_e_t_r_i_c__w_o_r_k_e_r__t_r_i_g_g_e_r__e_n_d_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of trigger evaluations ended by the Worker"
    m_e_t_r_i_c__w_o_r_k_e_r__t_r_i_g_g_e_r__e_r_r_o_r__c_o_u_n_t: ClassVar[str] = "worker.trigger.error.count"
    m_e_t_r_i_c__w_o_r_k_e_r__t_r_i_g_g_e_r__e_r_r_o_r__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of trigger evaluations that failed inside the Worker"
    m_e_t_r_i_c__w_o_r_k_e_r__t_r_i_g_g_e_r__e_x_e_c_u_t_i_o_n__c_o_u_n_t: ClassVar[str] = "worker.trigger.execution.count"
    m_e_t_r_i_c__w_o_r_k_e_r__t_r_i_g_g_e_r__e_x_e_c_u_t_i_o_n__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of triggers evaluated by the Worker"
    m_e_t_r_i_c__w_o_r_k_e_r__k_i_l_l_e_d__c_o_u_n_t: ClassVar[str] = "worker.killed.count"
    m_e_t_r_i_c__w_o_r_k_e_r__k_i_l_l_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of executions killed events received the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__t_h_r_e_a_d__c_o_u_n_t: ClassVar[str] = "executor.thread.count"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__t_h_r_e_a_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The number of executor threads"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__t_a_s_k_r_u_n__c_r_e_a_t_e_d__c_o_u_n_t: ClassVar[str] = "executor.taskrun.created.count"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__t_a_s_k_r_u_n__c_r_e_a_t_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of tasks created by the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__t_a_s_k_r_u_n__e_n_d_e_d__c_o_u_n_t: ClassVar[str] = "executor.taskrun.ended.count"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__t_a_s_k_r_u_n__e_n_d_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of tasks ended by the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__t_a_s_k_r_u_n__e_n_d_e_d__d_u_r_a_t_i_o_n: ClassVar[str] = "executor.taskrun.ended.duration"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__t_a_s_k_r_u_n__e_n_d_e_d__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Task duration inside the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__f_l_o_w_a_b_l_e__e_x_e_c_u_t_i_o_n__c_o_u_n_t: ClassVar[str] = "executor.flowable.execution.count"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__f_l_o_w_a_b_l_e__e_x_e_c_u_t_i_o_n__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of flowable tasks executed by the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__s_t_a_r_t_e_d__c_o_u_n_t: ClassVar[str] = "executor.execution.started.count"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__s_t_a_r_t_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of executions started by the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__e_n_d__c_o_u_n_t: ClassVar[str] = "executor.execution.end.count"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__e_n_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of executions ended by the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__d_u_r_a_t_i_o_n: ClassVar[str] = "executor.execution.duration"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Execution duration inside the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__m_e_s_s_a_g_e__p_r_o_c_e_s_s__d_u_r_a_t_i_o_n: ClassVar[str] = "executor.execution.message.process"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__m_e_s_s_a_g_e__p_r_o_c_e_s_s__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Duration of a single execution message processed by the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__k_i_l_l_e_d__c_o_u_n_t: ClassVar[str] = "executor.killed.count"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__k_i_l_l_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of executions killed events received the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__s_l_a__e_x_p_i_r_e_d__c_o_u_n_t: ClassVar[str] = "executor.sla.expired.count"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__s_l_a__e_x_p_i_r_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of expired SLA (i.e. executions with SLA of type MAX_DURATION that took longer than the SLA) evaluated by the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__s_l_a__v_i_o_l_a_t_i_o_n__c_o_u_n_t: ClassVar[str] = "executor.sla.violation.count"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__s_l_a__v_i_o_l_a_t_i_o_n__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of expired SLA (i.e. executions with SLA of type MAX_DURATION that took longer than the SLA) evaluated by the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__d_e_l_a_y__c_r_e_a_t_e_d__c_o_u_n_t: ClassVar[str] = "executor.execution.delay.created.count"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__d_e_l_a_y__c_r_e_a_t_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of execution delays created by the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__d_e_l_a_y__e_n_d_e_d__c_o_u_n_t: ClassVar[str] = "executor.execution.delay.ended.count"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__d_e_l_a_y__e_n_d_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of execution delays ended (resumed) by the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__w_o_r_k_e_r__j_o_b__r_e_s_u_b_m_i_t__c_o_u_n_t: ClassVar[str] = "executor.worker.job.resubmit.count"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__w_o_r_k_e_r__j_o_b__r_e_s_u_b_m_i_t__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of worker jobs resubmitted to the Worker by the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__q_u_e_u_e_d__c_o_u_n_t: ClassVar[str] = "executor.execution.queued.count"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__q_u_e_u_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of executions queued by the Executor"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__p_o_p_p_e_d__c_o_u_n_t: ClassVar[str] = "executor.execution.popped.count"
    m_e_t_r_i_c__e_x_e_c_u_t_o_r__e_x_e_c_u_t_i_o_n__p_o_p_p_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "The total number of executions popped by the Executor"
    m_e_t_r_i_c__i_n_d_e_x_e_r__r_e_q_u_e_s_t__c_o_u_n_t: ClassVar[str] = "indexer.request.count"
    m_e_t_r_i_c__i_n_d_e_x_e_r__r_e_q_u_e_s_t__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Total number of batches of records received by the Indexer"
    m_e_t_r_i_c__i_n_d_e_x_e_r__r_e_q_u_e_s_t__d_u_r_a_t_i_o_n: ClassVar[str] = "indexer.request.duration"
    m_e_t_r_i_c__i_n_d_e_x_e_r__r_e_q_u_e_s_t__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Batch of records duration inside the Indexer"
    m_e_t_r_i_c__i_n_d_e_x_e_r__r_e_q_u_e_s_t__r_e_t_r_y__c_o_u_n_t: ClassVar[str] = "indexer.request.retry.count"
    m_e_t_r_i_c__i_n_d_e_x_e_r__r_e_q_u_e_s_t__r_e_t_r_y__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Total number of batches of records retried by the Indexer"
    m_e_t_r_i_c__i_n_d_e_x_e_r__s_e_r_v_e_r__d_u_r_a_t_i_o_n: ClassVar[str] = "indexer.server.duration"
    m_e_t_r_i_c__i_n_d_e_x_e_r__s_e_r_v_e_r__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Batch of records indexation duration"
    m_e_t_r_i_c__i_n_d_e_x_e_r__m_e_s_s_a_g_e__f_a_i_l_e_d__c_o_u_n_t: ClassVar[str] = "indexer.message.failed.count"
    m_e_t_r_i_c__i_n_d_e_x_e_r__m_e_s_s_a_g_e__f_a_i_l_e_d__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Total number of records which failed to be indexed by the Indexer"
    m_e_t_r_i_c__i_n_d_e_x_e_r__m_e_s_s_a_g_e__i_n__c_o_u_n_t: ClassVar[str] = "indexer.message.in.count"
    m_e_t_r_i_c__i_n_d_e_x_e_r__m_e_s_s_a_g_e__i_n__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Total number of records received by the Indexer"
    m_e_t_r_i_c__i_n_d_e_x_e_r__m_e_s_s_a_g_e__o_u_t__c_o_u_n_t: ClassVar[str] = "indexer.message.out.count"
    m_e_t_r_i_c__i_n_d_e_x_e_r__m_e_s_s_a_g_e__o_u_t__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Total number of records indexed by the Indexer"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__l_o_o_p__c_o_u_n_t: ClassVar[str] = "scheduler.loop.count"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__l_o_o_p__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Total number of evaluation loops executed by the Scheduler"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__t_r_i_g_g_e_r__e_v_a_l_u_a_t_i_o_n__d_u_r_a_t_i_o_n: ClassVar[str] = "scheduler.trigger.evaluation.duration"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__t_r_i_g_g_e_r__e_v_a_l_u_a_t_i_o_n__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Trigger evaluation duration for trigger executed inside the Scheduler (Schedulable triggers)"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__t_r_i_g_g_e_r__c_o_u_n_t: ClassVar[str] = "scheduler.trigger.count"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__t_r_i_g_g_e_r__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Total number of executions triggered by the Scheduler"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__t_r_i_g_g_e_r__d_e_l_a_y__d_u_r_a_t_i_o_n: ClassVar[str] = "scheduler.trigger.delay.duration"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__t_r_i_g_g_e_r__d_e_l_a_y__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Trigger delay duration inside the Scheduler"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__e_v_a_l_u_a_t_e__c_o_u_n_t: ClassVar[str] = "scheduler.evaluate.count"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__e_v_a_l_u_a_t_e__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Total number of triggers evaluated by the Scheduler"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__e_x_e_c_u_t_i_o_n__l_o_c_k__d_u_r_a_t_i_o_n: ClassVar[str] = "scheduler.execution.lock.duration"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__e_x_e_c_u_t_i_o_n__l_o_c_k__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Trigger lock duration waiting for an execution to be terminated"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__e_x_e_c_u_t_i_o_n__m_i_s_s_i_n_g__d_u_r_a_t_i_o_n: ClassVar[str] = "scheduler.execution.missing.duration"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__e_x_e_c_u_t_i_o_n__m_i_s_s_i_n_g__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Missing execution duration inside the Scheduler. A missing execution is an execution that was triggered by the Scheduler but not yet started by the Executor"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__e_v_a_l_u_a_t_i_o_n__l_o_o_p__d_u_r_a_t_i_o_n: ClassVar[str] = "scheduler.evaluation.loop.duration"
    m_e_t_r_i_c__s_c_h_e_d_u_l_e_r__e_v_a_l_u_a_t_i_o_n__l_o_o_p__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Trigger evaluation loop duration inside the Scheduler"
    m_e_t_r_i_c__s_t_r_e_a_m_s__s_t_a_t_e__c_o_u_n_t: ClassVar[str] = "stream.state.count"
    m_e_t_r_i_c__s_t_r_e_a_m_s__s_t_a_t_e__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Number of Kafka Stream applications by state"
    m_e_t_r_i_c__j_d_b_c__q_u_e_r_y__d_u_r_a_t_i_o_n: ClassVar[str] = "jdbc.query.duration"
    m_e_t_r_i_c__j_d_b_c__q_u_e_r_y__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Duration of database queries"
    m_e_t_r_i_c__q_u_e_u_e__b_i_g__m_e_s_s_a_g_e__c_o_u_n_t: ClassVar[str] = "queue.big_message.count"
    m_e_t_r_i_c__q_u_e_u_e__b_i_g__m_e_s_s_a_g_e__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Total number of big messages"
    m_e_t_r_i_c__q_u_e_u_e__p_r_o_d_u_c_e__c_o_u_n_t: ClassVar[str] = "queue.produce.count"
    m_e_t_r_i_c__q_u_e_u_e__p_r_o_d_u_c_e__c_o_u_n_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Total number of produced messages"
    m_e_t_r_i_c__q_u_e_u_e__r_e_c_e_i_v_e__d_u_r_a_t_i_o_n: ClassVar[str] = "queue.receive.duration"
    m_e_t_r_i_c__q_u_e_u_e__r_e_c_e_i_v_e__d_u_r_a_t_i_o_n__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Queue duration to receive and consume a batch of messages"
    m_e_t_r_i_c__q_u_e_u_e__p_o_l_l__s_i_z_e: ClassVar[str] = "queue.poll.size"
    m_e_t_r_i_c__q_u_e_u_e__p_o_l_l__s_i_z_e__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = "Size of a poll to the queue (message batch size)"
    t_a_g__t_a_s_k__t_y_p_e: ClassVar[str] = "task_type"
    t_a_g__t_r_i_g_g_e_r__t_y_p_e: ClassVar[str] = "trigger_type"
    t_a_g__f_l_o_w__i_d: ClassVar[str] = "flow_id"
    t_a_g__n_a_m_e_s_p_a_c_e__i_d: ClassVar[str] = "namespace_id"
    t_a_g__s_t_a_t_e: ClassVar[str] = "state"
    t_a_g__a_t_t_e_m_p_t__c_o_u_n_t: ClassVar[str] = "attempt_count"
    t_a_g__w_o_r_k_e_r__g_r_o_u_p: ClassVar[str] = "worker_group"
    t_a_g__t_e_n_a_n_t__i_d: ClassVar[str] = "tenant_id"
    t_a_g__c_l_a_s_s__n_a_m_e: ClassVar[str] = "class_name"
    t_a_g__e_x_e_c_u_t_i_o_n__k_i_l_l_e_d__t_y_p_e: ClassVar[str] = "execution_killed_type"
    t_a_g__q_u_e_u_e__c_o_n_s_u_m_e_r: ClassVar[str] = "consumer"
    t_a_g__q_u_e_u_e__c_o_n_s_u_m_e_r__g_r_o_u_p: ClassVar[str] = "consumer_group"
    t_a_g__q_u_e_u_e__t_y_p_e: ClassVar[str] = "queue_type"
    t_a_g__l_a_b_e_l__p_r_e_f_i_x: ClassVar[str] = "label"
    t_a_g__l_a_b_e_l__p_l_a_c_e_h_o_l_d_e_r: ClassVar[str] = "__none__"
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
