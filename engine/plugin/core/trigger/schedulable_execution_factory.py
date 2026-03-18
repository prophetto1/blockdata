from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\trigger\SchedulableExecutionFactory.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.triggers.backfill import Backfill
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.label import Label
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.schedulable import Schedulable
from engine.core.models.triggers.trigger_context import TriggerContext


@dataclass(slots=True, kw_only=True)
class SchedulableExecutionFactory:

    @staticmethod
    def create_failed_execution(trigger: Schedulable, condition_context: ConditionContext, trigger_context: TriggerContext) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_execution(trigger: Schedulable, condition_context: ConditionContext, trigger_context: TriggerContext, variables: dict[str, Any], schedule_date: datetime) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_inputs(trigger: Schedulable, run_context: RunContext, backfill: Backfill) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_labels(trigger: Schedulable, run_context: RunContext, backfill: Backfill, flow: FlowInterface) -> list[Label]:
        raise NotImplementedError  # TODO: translate from Java
