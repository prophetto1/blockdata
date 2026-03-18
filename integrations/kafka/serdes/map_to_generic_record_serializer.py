from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\serdes\MapToGenericRecordSerializer.java
# WARNING: Unresolved types: AvroSchema, GenericArray, GenericEnumSymbol, GenericFixed, GenericRecord, Serializer

from dataclasses import dataclass
from typing import Any

from integrations.kafka.serdes.kafka_avro_serializer import KafkaAvroSerializer
from integrations.gcp.bigquery.models.schema import Schema


@dataclass(slots=True, kw_only=True)
class MapToGenericRecordSerializer:
    serializer: KafkaAvroSerializer | None = None
    schema: AvroSchema | None = None

    def configure(self, configs: dict[str, Any], is_key: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def serialize(self, topic: str, data: Any) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_value(schema: Schema, data: Any) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_union_value(schema: Schema, value: Any) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_record_value(schema: Schema, data: dict[str, Any]) -> GenericRecord:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_map_value(schema: Schema, data: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_array_value(schema: Schema, data: list[Any]) -> GenericArray[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_enum_value(schema: Schema, data: str) -> GenericEnumSymbol[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_fixed_value(schema: Schema, data: list[int]) -> GenericFixed:
        raise NotImplementedError  # TODO: translate from Java
