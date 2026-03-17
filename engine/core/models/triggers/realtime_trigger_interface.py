from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\RealtimeTriggerInterface.java
# WARNING: Unresolved types: Exception, Publisher

from typing import Any, Protocol

from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.worker_trigger_interface import WorkerTriggerInterface


class RealtimeTriggerInterface(WorkerTriggerInterface, Protocol):
    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]: ...
