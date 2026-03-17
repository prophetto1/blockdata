from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\hierarchies\SubflowGraphTask.java
# WARNING: Unresolved types: RestartBehavior, SubflowId

from dataclasses import dataclass, replace
from typing import Any, Optional

from engine.core.models.hierarchies.abstract_graph_task import AbstractGraphTask
from engine.core.models.tasks.executable_task import ExecutableTask
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.runners.flow_meta_store_interface import FlowMetaStoreInterface
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.flows.output import Output
from engine.core.models.hierarchies.relation_type import RelationType
from engine.core.runners.run_context import RunContext
from engine.core.runners.subflow_execution import SubflowExecution
from engine.core.runners.subflow_execution_result import SubflowExecutionResult
from engine.core.models.tasks.task_interface import TaskInterface
from engine.core.models.executions.task_run import TaskRun


@dataclass(slots=True, kw_only=True)
class SubflowGraphTask(AbstractGraphTask):

    def executable_task(self) -> ExecutableTask[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def with_rendered_subflow_id(self, run_context: RunContext) -> SubflowGraphTask:
        return replace(self, rendered_subflow_id=run_context)

    @dataclass(slots=True)
    class SubflowTaskWrapper:
        run_context: RunContext | None = None
        subflow_task: ExecutableTask[T] | None = None

        def create_subflow_executions(self, run_context: RunContext, flow_executor_interface: FlowMetaStoreInterface, current_flow: FlowInterface, current_execution: Execution, current_task_run: TaskRun) -> list[SubflowExecution[Any]]:
            raise NotImplementedError  # TODO: translate from Java

        def create_subflow_execution_result(self, run_context: RunContext, task_run: TaskRun, flow: FlowInterface, execution: Execution) -> Optional[SubflowExecutionResult]:
            raise NotImplementedError  # TODO: translate from Java

        def wait_for_execution(self) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def subflow_id(self) -> SubflowId:
            raise NotImplementedError  # TODO: translate from Java

        def get_restart_behavior(self) -> RestartBehavior:
            raise NotImplementedError  # TODO: translate from Java

        def get_id(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def get_type(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def get_version(self) -> str:
            raise NotImplementedError  # TODO: translate from Java
