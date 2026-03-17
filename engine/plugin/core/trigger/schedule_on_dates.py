from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\trigger\ScheduleOnDates.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from datetime import datetime
from datetime import timedelta
from typing import Any, Callable, ClassVar, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.triggers.recover_missed_schedules import RecoverMissedSchedules
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.schedulable import Schedulable
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class ScheduleOnDates(AbstractTrigger):
    """Schedule a Flow on specific dates."""
    timezone: str
    dates: Property[list[datetime]]
    logger: ClassVar[Logger] = getLogger(__name__)
    plugin_property_recover_missed_schedules: ClassVar[str] = "recoverMissedSchedules"
    interval: timedelta = None
    inputs: dict[str, Any] | None = None
    recover_missed_schedules: RecoverMissedSchedules | None = None

    def evaluate(self, condition_context: ConditionContext, trigger_context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def next_evaluation_date(self, condition_context: ConditionContext | None = None, trigger_context: Optional[Any] | None = None) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def previous_evaluation_date(self, condition_context: ConditionContext) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def with_time_zone(self, date: datetime) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def next_date(self, run_context: RunContext, predicate: Callable[datetime]) -> Optional[datetime]:
        raise NotImplementedError  # TODO: translate from Java
