from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\trigger\ScheduleOnDates.java
# WARNING: Unresolved types: Exception, Predicate

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.models.triggers.recover_missed_schedules import RecoverMissedSchedules
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.schedulable import Schedulable
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class ScheduleOnDates(AbstractTrigger):
    """Schedule a Flow on specific dates."""
    dates: Property[list[datetime]]
    p_l_u_g_i_n__p_r_o_p_e_r_t_y__r_e_c_o_v_e_r__m_i_s_s_e_d__s_c_h_e_d_u_l_e_s: str = "recoverMissedSchedules"
    interval: timedelta = None
    timezone: str = ZoneId.systemDefault().toString()
    inputs: dict[str, Any] | None = None
    recover_missed_schedules: RecoverMissedSchedules | None = None

    def evaluate(self, condition_context: ConditionContext, trigger_context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def next_evaluation_date(self, condition_context: ConditionContext, trigger_context: Optional[Any]) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def next_evaluation_date(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def previous_evaluation_date(self, condition_context: ConditionContext) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def with_time_zone(self, date: datetime) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def next_date(self, run_context: RunContext, predicate: Predicate[datetime]) -> Optional[datetime]:
        raise NotImplementedError  # TODO: translate from Java
