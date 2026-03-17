from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\flow\ForEachItem.java
# WARNING: Unresolved types: Exception, RestartBehavior, SubflowId, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.plugin.core.flow.child_flow_interface import ChildFlowInterface
from engine.core.models.tasks.executable_task import ExecutableTask
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.runners.flow_meta_store_interface import FlowMetaStoreInterface
from engine.core.models.tasks.flowable_task import FlowableTask
from engine.core.models.hierarchies.graph_cluster import GraphCluster
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.label import Label
from engine.core.serializers.list_or_map_of_label_deserializer import ListOrMapOfLabelDeserializer
from engine.core.serializers.list_or_map_of_label_serializer import ListOrMapOfLabelSerializer
from engine.core.models.executions.next_task_run import NextTaskRun
from engine.core.models.property.property import Property
from engine.core.models.tasks.resolved_task import ResolvedTask
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State
from engine.core.storages.storage_split_interface import StorageSplitInterface
from engine.core.runners.subflow_execution import SubflowExecution
from engine.core.runners.subflow_execution_result import SubflowExecutionResult
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.flows.type import Type
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class ForEachItem(Task):
    """Spawn a subflow for each batch of items."""
    batch: ForEachItem.Batch = Batch.builder().build()
    wait: bool = True
    transmit_failed: bool = True
    inherit_labels: bool = False
    restart_behavior: ExecutableTask.RestartBehavior = ExecutableTask.RestartBehavior.RETRY_FAILED
    items: str | None = None
    namespace: str | None = None
    flow_id: str | None = None
    revision: int | None = None
    inputs: dict[str, Any] | None = None
    labels: list[@NoSystemLabelValidation Label] | None = None
    schedule_date: Property[datetime] | None = None
    errors: list[Task] | None = None
    _finally: list[Task] | None = None

    def get_finally(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def tasks_tree(self, execution: Execution, task_run: TaskRun, parent_values: list[str]) -> GraphCluster:
        raise NotImplementedError  # TODO: translate from Java

    def all_child_tasks(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def child_tasks(self, run_context: RunContext, parent_task_run: TaskRun) -> list[ResolvedTask]:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_nexts(self, run_context: RunContext, execution: Execution, parent_task_run: TaskRun) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def get_tasks(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_output(run_context: RunContext, task_id: str) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ForEachItemSplit(Task):
        s_u_f_f_i_x: str = "_split"
        items: str | None = None
        batch: Batch | None = None

        def run(self, run_context: RunContext) -> ForEachItemSplit.Output:
            raise NotImplementedError  # TODO: translate from Java

        @dataclass(slots=True)
        class Output:
            splits: str | None = None

    @dataclass(slots=True)
    class ForEachItemExecutable(Task):
        s_u_f_f_i_x: str = "_items"
        inputs: dict[str, Any] | None = None
        inherit_labels: bool | None = None
        labels: list[Label] | None = None
        wait: bool | None = None
        transmit_failed: bool | None = None
        schedule_on: Property[datetime] | None = None
        subflow_id: SubflowId | None = None
        restart_behavior: RestartBehavior | None = None

        def create_subflow_executions(self, run_context: RunContext, flow_executor_interface: FlowMetaStoreInterface, current_flow: FlowInterface, current_execution: Execution, current_task_run: TaskRun) -> list[SubflowExecution[Any]]:
            raise NotImplementedError  # TODO: translate from Java

        def create_subflow_execution_result(self, run_context: RunContext, task_run: TaskRun, flow: FlowInterface, execution: Execution) -> Optional[SubflowExecutionResult]:
            raise NotImplementedError  # TODO: translate from Java

        def wait_for_execution(self) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def subflow_id(self) -> SubflowId:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ForEachItemMergeOutputs(Task):
        s_u_f_f_i_x: str = "_merge"

        def run(self, run_context: RunContext) -> ForEachItemMergeOutputs.Output:
            raise NotImplementedError  # TODO: translate from Java

        @dataclass(slots=True)
        class Output:
            subflow_outputs: str | None = None

    @dataclass(slots=True)
    class Batch:
        rows: Property[int] = Property.ofValue(1)
        separator: Property[str] = Property.ofValue("\n")
        bytes: Property[str] | None = None
        partitions: Property[int] | None = None
        regex_pattern: Property[str] | None = None

    @dataclass(slots=True)
    class Output:
        iterations: dict[State.Type, int] | None = None
        number_of_batches: int | None = None
        uri: str | None = None
