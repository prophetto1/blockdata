from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\serdes\GenericRecordToMapDeserializer.java
# WARNING: Unresolved types: Deserializer, GenericRecord, Headers, KafkaAvroDeserializer

from dataclasses import dataclass
from typing import Any

from integrations.gcp.bigquery.models.schema import Schema


@dataclass(slots=True, kw_only=True)
class GenericRecordToMapDeserializer:
    deserializer: KafkaAvroDeserializer | None = None

    def configure(self, configs: dict[str, Any], is_key: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def deserialize(self, topic: str, data: list[int]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def deserialize(self, topic: str, headers: Headers, data: list[int]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def record_deserializer(record: GenericRecord) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def object_deserializer(value: Any, schema: Schema) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def union_deserializer(value: Any, schema: Schema) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def map_deserializer(value: dict[str, Any], schema: Schema) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def array_deserializer(value: list[Any], schema: Schema) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java
