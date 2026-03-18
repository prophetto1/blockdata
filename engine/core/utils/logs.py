from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Logs.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_id import FlowId
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.triggers.trigger_context import TriggerContext


@dataclass(slots=True, kw_only=True)
class Logs:
    flow_prefix_with_tenant: ClassVar[str] = "[tenant: {}] [namespace: {}] [flow: {}] "
    execution_prefix_with_tenant: ClassVar[str] = FLOW_PREFIX_WITH_TENANT + "[execution: {}] "
    trigger_prefix_with_tenant: ClassVar[str] = FLOW_PREFIX_WITH_TENANT + "[trigger: {}] "
    taskrun_prefix_with_tenant: ClassVar[str] = FLOW_PREFIX_WITH_TENANT + "[task: {}] [execution: {}] [taskrun: {}] "

    @staticmethod
    def log_execution(flow: FlowId, logger: Any, level: int, message: str | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_trigger(trigger_context: TriggerContext, logger: Any, level: int, message: str | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_task_run(task_run: TaskRun, level: int, message: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def logger(task_run: TaskRun) -> Any:
        raise NotImplementedError  # TODO: translate from Java
