from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\ByteArrayProducer.java
# WARNING: Unresolved types: Exception, ProducerBuilder, PulsarClient, TypedMessageBuilder

from dataclasses import dataclass
from typing import Any

from integrations.pulsar.abstract_producer import AbstractProducer
from engine.core.runners.run_context import RunContext
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class ByteArrayProducer(AbstractProducer):
    serializer: SerdeType | None = None

    def get_producer_builder(self, client: PulsarClient) -> ProducerBuilder[list[int]]:
        raise NotImplementedError  # TODO: translate from Java

    def create_message_with_value(self, rendered_map: dict[str, Any]) -> TypedMessageBuilder[list[int]]:
        raise NotImplementedError  # TODO: translate from Java
