from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\SchedulerTriggerStateInterface.java
# WARNING: Unresolved types: ConstraintViolationException, Exception

from datetime import datetime
from typing import Any, Protocol

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.queues.queue_exception import QueueException
from engine.core.runners.schedule_context_interface import ScheduleContextInterface
from engine.core.models.triggers.trigger import Trigger
from engine.core.models.triggers.trigger_context import TriggerContext


class SchedulerTriggerStateInterface(Protocol):
    def find_last(self, trigger: TriggerContext) -> Optional[Trigger]: ...

    def find_all_for_all_tenants(self) -> list[Trigger]: ...

    def save(self, trigger: Trigger, schedule_context: ScheduleContextInterface) -> Trigger: ...

    def create(self, trigger: Trigger) -> Trigger: ...

    def save(self, trigger: Trigger, schedule_context: ScheduleContextInterface, header_content: str) -> Trigger: ...

    def create(self, trigger: Trigger, header_content: str) -> Trigger: ...

    def update(self, trigger: Trigger) -> Trigger: ...

    def update(self, flow: FlowWithSource, abstract_trigger: AbstractTrigger, condition_context: ConditionContext) -> Trigger: ...

    def delete(self, trigger: Trigger) -> None: ...

    def find_by_next_execution_date_ready_for_all_tenants(self, now: datetime, schedule_context: ScheduleContextInterface) -> list[Trigger]: ...

    def find_by_next_execution_date_ready_but_locked_triggers(self, now: datetime) -> list[Trigger]: ...

    def find_by_next_execution_date_ready_for_given_flows(self, flows: list[FlowWithSource], now: datetime, schedule_context: ScheduleContextInterface) -> list[Trigger]: ...
