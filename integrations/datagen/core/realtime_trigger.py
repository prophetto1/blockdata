from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.property.data import Data
from integrations.datagen.services.data_emitter import DataEmitter
from integrations.datagen.model.data_generator import DataGenerator
from engine.core.models.executions.execution import Execution
from integrations.datagen.generate_interface import GenerateInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger, RealtimeTriggerInterface, TriggerOutput, GenerateInterface):
    """Stream generated data in real time"""
    max_records: Property[int] | None = None
    throughput: Property[int] | None = None
    reporting_interval: Property[timedelta] | None = None
    generator: DataGenerator[Any]
    is_active: AtomicBoolean | None = None
    wait_for_termination: CountDownLatch | None = None
    data_emitter: DataEmitter | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self, wait: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java
