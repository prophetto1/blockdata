from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\PollingTriggerInterface.java
# WARNING: Unresolved types: Exception

from datetime import datetime
from datetime import timedelta
from typing import Any, Protocol

from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.exceptions.invalid_trigger_configuration_exception import InvalidTriggerConfigurationException
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.worker_trigger_interface import WorkerTriggerInterface


class PollingTriggerInterface(Protocol):
    def get_interval(self) -> timedelta: ...

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]: ...

    def next_evaluation_date(self, condition_context: ConditionContext, last: Optional[Any]) -> datetime: ...

    def next_evaluation_date(self) -> datetime: ...

    def compute_next_evaluation_date(self) -> datetime: ...
