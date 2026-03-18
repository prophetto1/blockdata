from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\Trigger.java
# WARNING: Unresolved types: TriggerContextBuilder

from abc import ABC, abstractmethod
from dataclasses import dataclass, replace
from datetime import datetime
from typing import Any, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.triggers.backfill import Backfill
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow import Flow
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.has_uid import HasUID
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

    @staticmethod
    def uid(flow: FlowInterface | None = None, abstract_trigger: AbstractTrigger | None = None) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def flow_uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(flow: FlowInterface, abstract_trigger: AbstractTrigger, condition_context: ConditionContext | None = None, last_trigger: Optional[Trigger] | None = None) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_evaluate_failed(trigger_context: TriggerContext, next_execution_date: datetime) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def reset_execution(self, flow: Flow, execution: Execution | None = None, condition_context: ConditionContext | None = None) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def unlock(self) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def with_backfill(self, backfill: Backfill) -> Trigger:
        return replace(self, backfill=backfill)

    def check_backfill(self) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_context(trigger_context: TriggerContext) -> TriggerBuilder[Any, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TriggerBuilder(ABC, TriggerContextBuilder):
        pass
