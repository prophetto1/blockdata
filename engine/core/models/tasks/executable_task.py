from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\ExecutableTask.java
# WARNING: Unresolved types: T

from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional, Protocol

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.runners.flow_meta_store_interface import FlowMetaStoreInterface
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.flows.output import Output
from engine.core.runners.run_context import RunContext
from engine.core.runners.subflow_execution import SubflowExecution
from engine.core.runners.subflow_execution_result import SubflowExecutionResult
from engine.core.models.executions.task_run import TaskRun


class ExecutableTask(Protocol):
    def create_subflow_executions(self, run_context: RunContext, flow_executor_interface: FlowMetaStoreInterface, current_flow: FlowInterface, current_execution: Execution, current_task_run: TaskRun) -> list[SubflowExecution[Any]]: ...

    def create_subflow_execution_result(self, run_context: RunContext, task_run: TaskRun, flow: FlowInterface, execution: Execution) -> Optional[SubflowExecutionResult]: ...

    def wait_for_execution(self) -> bool: ...

    def subflow_id(self) -> SubflowId: ...

    def get_restart_behavior(self) -> RestartBehavior: ...
