from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\Trigger.java
# WARNING: Unresolved types: B, C, Exception, TriggerContextBuilder

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.triggers.backfill import Backfill
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow import Flow
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.has_u_i_d import HasUID
from engine.core.models.flows.state import State
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class Trigger(TriggerContext):
    execution_id: str | None = None
    updated_date: datetime | None = None
    evaluate_running_date: datetime | None = None
    worker_id: str | None = None

    @staticmethod
    def builder() -> TriggerBuilder[Any, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def uid(trigger: Trigger) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def uid(execution: Execution) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def uid(flow: FlowInterface, abstract_trigger: AbstractTrigger) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def flow_uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(flow: FlowInterface, abstract_trigger: AbstractTrigger) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(trigger_context: TriggerContext, next_execution_date: datetime) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(trigger_context: TriggerContext, execution: Execution, next_execution_date: datetime) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_evaluate_failed(trigger_context: TriggerContext, next_execution_date: datetime) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(execution: Execution, trigger: Trigger) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(trigger: Trigger, evaluate_running_date: datetime) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(flow: FlowInterface, abstract_trigger: AbstractTrigger, condition_context: ConditionContext, last_trigger: Optional[Trigger]) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def reset_execution(self, flow: Flow, execution: Execution, condition_context: ConditionContext) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def reset_execution(self, execution_end_state: State.Type) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def reset_execution(self, execution_end_state: State.Type, next_execution_date: datetime) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def unlock(self) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def with_backfill(self, backfill: Backfill) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def check_backfill(self) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_context(trigger_context: TriggerContext) -> TriggerBuilder[Any, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TriggerBuilder(ABC, TriggerContextBuilder):
        pass
