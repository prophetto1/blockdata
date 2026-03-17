from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\AbstractKafkaConnection.java
# WARNING: Unresolved types: AtomicReference, AvroSchema, Deserializer, Exception, Properties, SerializationException, Serializer

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.kafka.kafka_connection_interface import KafkaConnectionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.amqp.models.serde_type import SerdeType
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractKafkaConnection(ABC, Task):
    properties: Property[dict[str, str]]
    serde_properties: Property[dict[str, str]] = Property.ofValue(new HashMap<>())
    data_on_serde_error: AtomicReference[Any] = new AtomicReference<>()

    @staticmethod
    def create_properties(map_properties: Property[dict[str, str]], run_context: RunContext) -> Properties:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_typed_serializer(s: SerdeType, avro_schema: AvroSchema) -> Serializer[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_typed_deserializer(s: SerdeType) -> Deserializer[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PluginKafkaSerdeException(SerializationException):
        data: str | None = None
