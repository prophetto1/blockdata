from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kafka.kafka_connection_interface import KafkaConnectionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.redis.models.serde_type import SerdeType
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractKafkaConnection(Task, KafkaConnectionInterface):
    properties: Property[dict[String, String]]
    serde_properties: Property[dict[String, String]] | None = None
    data_on_serde_error: AtomicReference[Object] | None = None

    def create_properties(self, map_properties: Property[dict[String, String]], run_context: RunContext) -> Properties:
        raise NotImplementedError  # TODO: translate from Java

    def get_typed_serializer(self, s: SerdeType, avro_schema: AvroSchema) -> Serializer[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_typed_deserializer(self, s: SerdeType) -> Deserializer[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PluginKafkaSerdeException(SerializationException):
        data: str | None = None


@dataclass(slots=True, kw_only=True)
class PluginKafkaSerdeException(SerializationException):
    data: str | None = None
