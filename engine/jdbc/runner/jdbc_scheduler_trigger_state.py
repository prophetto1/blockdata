from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\JdbcSchedulerTriggerState.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional

from engine.jdbc.repository.abstract_jdbc_trigger_repository import AbstractJdbcTriggerRepository
from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.queues.queue_exception import QueueException
from engine.core.runners.schedule_context_interface import ScheduleContextInterface
from engine.core.runners.scheduler_trigger_state_interface import SchedulerTriggerStateInterface
from engine.core.models.triggers.trigger import Trigger
from engine.core.models.triggers.trigger_context import TriggerContext


@dataclass(slots=True, kw_only=True)
class JdbcSchedulerTriggerState:
    trigger_repository: AbstractJdbcTriggerRepository | None = None

    def init_trigger_evaluate_running(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def find_last(self, context: TriggerContext) -> Optional[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_for_all_tenants(self) -> list[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, trigger: Trigger, schedule_context_interface: ScheduleContextInterface, header_content: str | None = None) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def create(self, trigger: Trigger, header_content: str | None = None) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def update(self, flow: FlowWithSource, abstract_trigger: AbstractTrigger | None = None, condition_context: ConditionContext | None = None) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, trigger: Trigger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_next_execution_date_ready_for_all_tenants(self, now: datetime, schedule_context: ScheduleContextInterface) -> list[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_next_execution_date_ready_but_locked_triggers(self, now: datetime) -> list[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_next_execution_date_ready_for_given_flows(self, flows: list[FlowWithSource], now: datetime, schedule_context: ScheduleContextInterface) -> list[Trigger]:
        raise NotImplementedError  # TODO: translate from Java
