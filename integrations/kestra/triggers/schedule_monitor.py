from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from datetime import timedelta

from integrations.kestra.abstract_kestra_trigger import AbstractKestraTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class ScheduleMonitor(AbstractKestraTrigger, TriggerOutput, PollingTriggerInterface):
    """Detect unhealthy schedule triggers"""
    d_e_f_a_u_l_t__k_e_s_t_r_a__u_r_l: str | None = None
    k_e_s_t_r_a__u_r_l__t_e_m_p_l_a_t_e: str | None = None
    interval: timedelta | None = None
    namespace: Property[str] | None = None
    flow_id: Property[str] | None = None
    include_disabled: Property[bool] | None = None
    allowed_delay: Property[timedelta] | None = None
    max_execution_duration: Property[timedelta] | None = None
    max_execution_interval: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def run_checks(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TriggerInfo:
        namespace: str | None = None
        flow_id: str | None = None
        trigger_id: str | None = None
        last_execution: datetime | None = None
        expected_next: datetime | None = None

    @dataclass(slots=True)
    class Output(io):
        data: list[TriggerInfo] | None = None


@dataclass(slots=True, kw_only=True)
class TriggerInfo:
    namespace: str | None = None
    flow_id: str | None = None
    trigger_id: str | None = None
    last_execution: datetime | None = None
    expected_next: datetime | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    data: list[TriggerInfo] | None = None
