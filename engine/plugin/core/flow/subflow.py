from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\flow\Subflow.java
# WARNING: Unresolved types: Exception, RestartBehavior, SubflowId, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar, Optional

from engine.plugin.core.flow.child_flow_interface import ChildFlowInterface
from engine.core.models.tasks.executable_task import ExecutableTask
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.runners.flow_meta_store_interface import FlowMetaStoreInterface
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.label import Label
from engine.core.serializers.list_or_map_of_label_deserializer import ListOrMapOfLabelDeserializer
from engine.core.serializers.list_or_map_of_label_serializer import ListOrMapOfLabelSerializer
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.state import State
from engine.core.runners.subflow_execution import SubflowExecution
from engine.core.runners.subflow_execution_result import SubflowExecutionResult
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.flows.type import Type
from engine.core.models.executions.variables import Variables


@dataclass(slots=True, kw_only=True)
class Subflow(Task):
    """Call another flow as a subflow."""
    flow_id: str
    p_l_u_g_i_n__f_l_o_w__o_u_t_p_u_t_s__e_n_a_b_l_e_d: ClassVar[str] = "outputs.enabled"
    wait: bool = True
    transmit_failed: bool = True
    inherit_labels: Property[bool] = Property.ofValue(false)
    restart_behavior: RestartBehavior = RestartBehavior.RETRY_FAILED
    namespace: str | None = None
    revision: int | None = None
    inputs: dict[str, Any] | None = None
    labels: list[@NoSystemLabelValidation Label] | None = None
    outputs: dict[str, Any] | None = None
    schedule_date: Property[datetime] | None = None

    def create_subflow_executions(self, run_context: RunContext, flow_executor_interface: FlowMetaStoreInterface, current_flow: FlowInterface, current_execution: Execution, current_task_run: TaskRun) -> list[SubflowExecution[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def create_subflow_execution_result(self, run_context: RunContext, task_run: TaskRun, flow: FlowInterface, execution: Execution) -> Optional[SubflowExecutionResult]:
        raise NotImplementedError  # TODO: translate from Java

    def fail_subflow_due_to_output(self, run_context: RunContext, task_run: TaskRun, execution: Execution, e: Exception, outputs: Variables) -> Optional[SubflowExecutionResult]:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_execution(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def subflow_id(self) -> SubflowId:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        execution_id: str | None = None
        state: State.Type | None = None
        outputs: dict[str, Any] | None = None
