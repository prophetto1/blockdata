from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from integrations.datagen.batch_generate_interface import BatchGenerateInterface
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.property.data import Data
from integrations.datagen.model.data_generator import DataGenerator
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, BatchGenerateInterface):
    """Poll to generate data batches"""
    generator: DataGenerator[Any] | None = None
    store: Property[bool] | None = None
    batch_size: Property[int] | None = None
    interval: timedelta | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
