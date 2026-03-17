from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\TriggerService.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.executions.execution_trigger import ExecutionTrigger
from engine.core.models.tasks.output import Output
from engine.core.models.triggers.trigger_context import TriggerContext


@dataclass(slots=True, kw_only=True)
class TriggerService:

    @staticmethod
    def generate_execution(trigger: AbstractTrigger, condition_context: ConditionContext, context: TriggerContext, variables: dict[str, Any]) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def generate_execution(trigger: AbstractTrigger, condition_context: ConditionContext, context: TriggerContext, output: Output) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def generate_realtime_execution(trigger: AbstractTrigger, condition_context: ConditionContext, context: TriggerContext, output: Output) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def generate_execution(id: str, trigger: AbstractTrigger, context: TriggerContext, execution_trigger: ExecutionTrigger, condition_context: ConditionContext) -> Execution:
        raise NotImplementedError  # TODO: translate from Java
