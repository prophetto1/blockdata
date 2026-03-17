from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\AbstractReader.java
# WARNING: Unresolved types: AtomicInteger, Exception, IOException, Supplier, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.pulsar.abstract_pulsar_connection import AbstractPulsarConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.amqp.models.message import Message
from integrations.pulsar.polling_interface import PollingInterface
from engine.core.models.property.property import Property
from integrations.pulsar.read_interface import ReadInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class AbstractReader(ABC, AbstractPulsarConnection):
    deserializer: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    poll_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(2))
    topic: Any | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None

    def read(self, run_context: RunContext, supplier: Supplier[list[Message[list[int]]]]) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def deserialize_with_schema(self, avro_binary: list[int], run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def ended(self, count: AtomicInteger, start: datetime, last_pool: datetime, run_context: RunContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def topics(self, run_context: RunContext) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages_count: int | None = None
        uri: str | None = None
