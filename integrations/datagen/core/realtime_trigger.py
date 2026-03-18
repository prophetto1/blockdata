from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\core\RealtimeTrigger.java
# WARNING: Unresolved types: AtomicBoolean, CountDownLatch, Exception, Publisher

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.datagen.data import Data
from integrations.datagen.services.data_emitter import DataEmitter
from integrations.datagen.model.data_generator import DataGenerator
from engine.core.models.executions.execution import Execution
from integrations.datagen.generate_interface import GenerateInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger):
    """Stream generated data in real time"""
    generator: DataGenerator[Any]
    max_records: Property[int] = Property.ofValue(Long.MAX_VALUE)
    throughput: Property[int] = Property.ofValue(1)
    reporting_interval: Property[timedelta] = Property.ofValue(Duration.ofSeconds(15))
    is_active: AtomicBoolean = new AtomicBoolean(true)
    wait_for_termination: CountDownLatch = new CountDownLatch(1)
    data_emitter: DataEmitter | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self, wait: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java
