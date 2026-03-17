from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kafka.abstract_kafka_connection import AbstractKafkaConnection
from engine.core.models.property.data import Data
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Produce(AbstractKafkaConnection, RunnableTask, Data):
    """Publish records to Kafka topics"""
    topic: Property[str] | None = None
    from: Any | None = None
    key_serializer: Property[SerdeType]
    value_serializer: Property[SerdeType]
    key_avro_schema: Property[str] | None = None
    value_avro_schema: Property[str] | None = None
    transactional: Property[bool] | None = None
    connection_checkers: list[String] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def parse_avro_schema(self, run_context: RunContext, avro_schema: Property[str]) -> AvroSchema:
        raise NotImplementedError  # TODO: translate from Java

    def producer_record(self, run_context: RunContext, producer: KafkaProducer[Object, Object], map: dict[String, Object]) -> ProducerRecord[Object, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def process_timestamp(self, timestamp: Any) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def process_headers(self, headers: Any) -> Iterable[Header]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        messages_count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    messages_count: int | None = None
