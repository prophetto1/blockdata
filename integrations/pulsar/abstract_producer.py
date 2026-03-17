from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.datagen.model.producer import Producer
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractProducer:
    producer_builder: ProducerBuilder[T] | None = None
    producer: Producer[T] | None = None
    client: PulsarClient | None = None
    run_context: RunContext | None = None

    def construct_producer(self, topic: str, producer_name: str, access_mode: ProducerAccessMode, encryption_key: str, compression_type: CompressionType, producer_properties: dict[String, String]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def produce_message(self, from: Any) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def build_flowable(self, flowable: Flux[Object]) -> Flux[Integer]:
        raise NotImplementedError  # TODO: translate from Java

    def produce_message(self, map: dict[String, Object]) -> CompletableFuture[MessageId]:
        raise NotImplementedError  # TODO: translate from Java

    def process_timestamp(self, timestamp: Any) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_producer_builder(self, client: PulsarClient) -> ProducerBuilder[T]:
        raise NotImplementedError  # TODO: translate from Java

    def create_message_with_value(self, rendered_map: dict[String, Object]) -> TypedMessageBuilder[T]:
        raise NotImplementedError  # TODO: translate from Java
