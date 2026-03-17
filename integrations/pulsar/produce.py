from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\Produce.java
# WARNING: Unresolved types: CompressionType, Exception, From, ProducerAccessMode, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.pulsar.abstract_pulsar_connection import AbstractPulsarConnection
from integrations.datagen.data import Data
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Produce(AbstractPulsarConnection):
    """Publish messages to a Pulsar topic"""
    topic: Property[str]
    from: Any
    serializer: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    producer_name: Property[str] | None = None
    producer_properties: Property[dict[str, str]] | None = None
    access_mode: Property[ProducerAccessMode] | None = None
    encryption_key: Property[str] | None = None
    compression_type: Property[CompressionType] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages_count: int | None = None
