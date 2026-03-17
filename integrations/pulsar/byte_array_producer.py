from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.pulsar.abstract_producer import AbstractProducer
from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class ByteArrayProducer(AbstractProducer):
    serializer: SerdeType | None = None

    def get_producer_builder(self, client: PulsarClient) -> ProducerBuilder[byte]:
        raise NotImplementedError  # TODO: translate from Java

    def create_message_with_value(self, rendered_map: dict[String, Object]) -> TypedMessageBuilder[byte]:
        raise NotImplementedError  # TODO: translate from Java
