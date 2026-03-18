from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\Produce.java
# WARNING: Unresolved types: AvroSchema, Exception, From, Header, KafkaProducer, ProducerRecord, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any

from integrations.kafka.abstract_kafka_connection import AbstractKafkaConnection
from integrations.datagen.data import Data
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Produce(AbstractKafkaConnection):
    """Publish records to Kafka topics"""
    key_serializer: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    value_serializer: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    transactional: Property[bool] = Property.ofValue(true)
    connection_checkers: list[str] = field(default_factory=list)
    topic: Property[str] | None = None
    from: Any | None = None
    key_avro_schema: Property[str] | None = None
    value_avro_schema: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_avro_schema(run_context: RunContext, avro_schema: Property[str]) -> AvroSchema:
        raise NotImplementedError  # TODO: translate from Java

    def producer_record(self, run_context: RunContext, producer: KafkaProducer[Any, Any], map: dict[str, Any]) -> ProducerRecord[Any, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def process_timestamp(self, timestamp: Any) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def process_headers(self, headers: Any) -> list[Header]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages_count: int | None = None
