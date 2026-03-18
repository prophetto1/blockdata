from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\GenericRecordProducer.java
# WARNING: Unresolved types: Exception, GenericRecord, ProducerBuilder, PulsarClient, TypedMessageBuilder, apache, avro, org, pulsar, shade

from dataclasses import dataclass
from typing import Any

from integrations.pulsar.abstract_producer import AbstractProducer
from engine.core.runners.run_context import RunContext
from integrations.gcp.bigquery.models.schema import Schema
from integrations.pulsar.schema_type import SchemaType


@dataclass(slots=True, kw_only=True)
class GenericRecordProducer(AbstractProducer):
    schema: Schema[GenericRecord] | None = None
    schema_string: str | None = None
    schema_type: SchemaType | None = None

    def get_producer_builder(self, client: PulsarClient) -> ProducerBuilder[GenericRecord]:
        raise NotImplementedError  # TODO: translate from Java

    def create_message_with_value(self, rendered_map: dict[str, Any]) -> TypedMessageBuilder[GenericRecord]:
        raise NotImplementedError  # TODO: translate from Java

    def denest_record(self, value: Any, schema: org.apache.pulsar.shade.org.apache.avro.Schema) -> Any:
        raise NotImplementedError  # TODO: translate from Java
