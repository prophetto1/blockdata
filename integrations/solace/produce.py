from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\Produce.java
# WARNING: Unresolved types: Exception, From, InputStream, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.solace.abstract_solace_task import AbstractSolaceTask
from integrations.datagen.data import Data
from integrations.solace.service.publisher.delivery_modes import DeliveryModes
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.eventhubs.serdes.serdes import Serdes


@dataclass(slots=True, kw_only=True)
class Produce(AbstractSolaceTask):
    """Publish messages to Solace topics"""
    from: Any
    topic_destination: Property[str]
    message_serializer: Property[Serdes] = Property.ofValue(Serdes.STRING)
    message_serializer_properties: Property[dict[str, Any]] = Property.ofValue(new HashMap<>())
    delivery_mode: Property[DeliveryModes] = Property.ofValue(DeliveryModes.PERSISTENT)
    await_acknowledgement_timeout: Property[timedelta] = Property.ofValue(Duration.ofMinutes(1))
    message_properties: Property[dict[str, str]] = Property.ofValue(new HashMap<>())

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def send(self, run_context: RunContext, stream: InputStream) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages_count: int | None = None
