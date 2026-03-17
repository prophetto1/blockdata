from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from datetime import timedelta

from integrations.pulsar.abstract_pulsar_connection import AbstractPulsarConnection
from integrations.mqtt.services.message import Message
from integrations.pulsar.polling_interface import PollingInterface
from engine.core.models.property.property import Property
from integrations.pulsar.read_interface import ReadInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class AbstractReader(AbstractPulsarConnection, ReadInterface, PollingInterface, RunnableTask):
    topic: Any | None = None
    deserializer: Property[SerdeType] | None = None
    poll_duration: Property[timedelta] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None

    def read(self, run_context: RunContext, supplier: Supplier[List[Message[byte]]]) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def deserialize_with_schema(self, avro_binary: byte, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def ended(self, count: AtomicInteger, start: datetime, last_pool: datetime, run_context: RunContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def topics(self, run_context: RunContext) -> list[String]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        messages_count: int | None = None
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    messages_count: int | None = None
    uri: str | None = None
