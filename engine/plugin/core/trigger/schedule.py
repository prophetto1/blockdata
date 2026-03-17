from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\trigger\Schedule.java
# WARNING: Unresolved types: Cron, CronDefinitionBuilder, CronParser, Exception, ExecutionTime, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from logging import logging
from datetime import datetime
from datetime import timedelta
from typing import Any, ClassVar, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition import Condition
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.triggers.recover_missed_schedules import RecoverMissedSchedules
from engine.core.models.triggers.schedulable import Schedulable
from engine.core.models.conditions.schedule_condition import ScheduleCondition
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Schedule(AbstractTrigger):
    """Schedule a Flow with a CRON expression."""
    cron_definition_builder: ClassVar[CronDefinitionBuilder]
    cron_parser: ClassVar[CronParser]
    cron_parser_with_seconds: ClassVar[CronParser]
    cron: str
    timezone: str
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    with_seconds: bool = False
    interval: timedelta = None
    schedule_conditions: list[ScheduleCondition] | None = None
    inputs: dict[str, Any] | None = None
    late_maximum_delay: timedelta | None = None
    execution_time: ExecutionTime | None = None
    backfill: dict[str, Any] | None = None
    recover_missed_schedules: RecoverMissedSchedules | None = None

    def get_conditions(self) -> list[Condition]:
        raise NotImplementedError  # TODO: translate from Java

    def next_evaluation_date(self, condition_context: ConditionContext, last: Optional[Any]) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def next_evaluation_date(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def previous_evaluation_date(self, condition_context: ConditionContext) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext, trigger_context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_cron(self) -> Cron:
        raise NotImplementedError  # TODO: translate from Java

    def schedule_dates(self, execution_time: ExecutionTime, date: datetime) -> Optional[Output]:
        raise NotImplementedError  # TODO: translate from Java

    def condition_context(self, condition_context: ConditionContext, output: Output) -> ConditionContext:
        raise NotImplementedError  # TODO: translate from Java

    def execution_time(self) -> ExecutionTime:
        raise NotImplementedError  # TODO: translate from Java

    def convert_date_time(self, date: datetime) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def compute_next_evaluation_date(self, execution_time: ExecutionTime, date: datetime) -> Optional[datetime]:
        raise NotImplementedError  # TODO: translate from Java

    def compute_previous_evaluation_date(self, execution_time: ExecutionTime, date: datetime) -> Optional[datetime]:
        raise NotImplementedError  # TODO: translate from Java

    def true_output_with_condition(self, execution_time: ExecutionTime, condition_context: ConditionContext, output: Output) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def true_previous_next_date_with_condition(self, execution_time: ExecutionTime, condition_context: ConditionContext, to_test_date: datetime, next: bool) -> Optional[datetime]:
        raise NotImplementedError  # TODO: translate from Java

    def handle_max_delay(self, output: Output) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def validate_schedule_condition(self, condition_context: ConditionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        date: datetime
        next: datetime
        previous: datetime
