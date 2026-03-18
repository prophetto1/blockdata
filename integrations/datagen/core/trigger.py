from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\core\Trigger.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from integrations.datagen.batch_generate_interface import BatchGenerateInterface
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.datagen.data import Data
from integrations.datagen.model.data_generator import DataGenerator
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Poll to generate data batches"""
    store: Property[bool] = Property.ofValue(false)
    batch_size: Property[int] = Property.ofValue(1)
    interval: timedelta = Duration.ofSeconds(1)
    generator: DataGenerator[Any] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
