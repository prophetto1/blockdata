from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\Schedulable.java

from datetime import datetime
from typing import Any, Protocol

from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.triggers.recover_missed_schedules import RecoverMissedSchedules
from engine.core.runners.run_context import RunContext


class Schedulable(PollingTriggerInterface, Protocol):
    def get_inputs(self) -> dict[str, Any]: ...

    def get_recover_missed_schedules(self) -> RecoverMissedSchedules: ...

    def previous_evaluation_date(self, condition_context: ConditionContext) -> datetime: ...

    def default_recover_missed_schedules(self, run_context: RunContext) -> RecoverMissedSchedules: ...
