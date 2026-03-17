from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\ExecutableUtils.java
# WARNING: Unresolved types: T

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.tasks.executable_task import ExecutableTask
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.runners.flow_meta_store_interface import FlowMetaStoreInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.label import Label
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.state import State
from engine.core.storages.storage import Storage
from engine.core.runners.subflow_execution import SubflowExecution
from engine.core.runners.subflow_execution_result import SubflowExecutionResult
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class ExecutableUtils:
    t_a_s_k__v_a_r_i_a_b_l_e__i_t_e_r_a_t_i_o_n_s: str = "iterations"
    t_a_s_k__v_a_r_i_a_b_l_e__n_u_m_b_e_r__o_f__b_a_t_c_h_e_s: str = "numberOfBatches"
    t_a_s_k__v_a_r_i_a_b_l_e__s_u_b_f_l_o_w__o_u_t_p_u_t_s__b_a_s_e__u_r_i: str = "subflowOutputsBaseUri"

    @staticmethod
    def guess_state(execution: Execution, transmit_failed: bool, allowed_failure: bool, allow_warning: bool) -> State.Type:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def subflow_execution_result(parent_taskrun: TaskRun, execution: Execution) -> SubflowExecutionResult:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def subflow_execution(run_context: RunContext, flow_executor_interface: FlowMetaStoreInterface, current_execution: Execution, current_flow: FlowInterface, current_task: T, current_task_run: TaskRun, inputs: dict[str, Any], labels: list[Label], inherit_labels: bool, schedule_date: Property[datetime]) -> Optional[SubflowExecution[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def filter_labels(labels: list[Label], flow: FlowInterface) -> list[Label]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def system_labels(execution: Execution) -> list[Label]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def manage_iterations(storage: Storage, task_run: TaskRun, execution: Execution, transmit_failed: bool, allow_failure: bool, allow_warning: bool) -> TaskRun:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def find_terminal_state(iterations: dict[str, int], allow_failure: bool, allow_warning: bool) -> State.Type:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def subflow_execution_result_from_child_execution(run_context: RunContext, flow: FlowInterface, execution: Execution, executable_task: ExecutableTask[Any], task_run: TaskRun) -> SubflowExecutionResult:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_subflow(execution: Execution) -> bool:
        raise NotImplementedError  # TODO: translate from Java
