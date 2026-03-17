from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.pulsar.abstract_pulsar_connection import AbstractPulsarConnection
from engine.core.models.property.data import Data
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Produce(AbstractPulsarConnection, RunnableTask, Data):
    """Publish messages to a Pulsar topic"""
    topic: Property[str]
    from: Any
    serializer: Property[SerdeType]
    producer_name: Property[str] | None = None
    producer_properties: Property[dict[String, String]] | None = None
    access_mode: Property[ProducerAccessMode] | None = None
    encryption_key: Property[str] | None = None
    compression_type: Property[CompressionType] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        messages_count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    messages_count: int | None = None
