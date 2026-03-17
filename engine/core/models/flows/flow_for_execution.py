from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\FlowForExecution.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.abstract_flow import AbstractFlow
from engine.core.models.triggers.abstract_trigger_for_execution import AbstractTriggerForExecution
from engine.core.models.executions.statistics.flow import Flow
from engine.core.models.tasks.task_for_execution import TaskForExecution


@dataclass(slots=True, kw_only=True)
class FlowForExecution(AbstractFlow):
    tasks: list[TaskForExecution] | None = None
    errors: list[TaskForExecution] | None = None
    _finally: list[TaskForExecution] | None = None
    after_execution: list[TaskForExecution] | None = None
    triggers: list[AbstractTriggerForExecution] | None = None

    @staticmethod
    def of(flow: Flow) -> FlowForExecution:
        raise NotImplementedError  # TODO: translate from Java

    def get_source(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_deleted(self) -> FlowForExecution:
        raise NotImplementedError  # TODO: translate from Java
