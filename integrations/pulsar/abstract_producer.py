from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\AbstractProducer.java
# WARNING: Unresolved types: CompletableFuture, CompressionType, Exception, Flux, MessageId, ProducerAccessMode, ProducerBuilder, PulsarClient, T, TypedMessageBuilder

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.datagen.model.producer import Producer
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractProducer(ABC):
    producer_builder: ProducerBuilder[T] | None = None
    producer: Producer[T] | None = None
    client: PulsarClient | None = None
    run_context: RunContext | None = None

    def construct_producer(self, topic: str, producer_name: str, access_mode: ProducerAccessMode, encryption_key: str, compression_type: CompressionType, producer_properties: dict[str, str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def produce_message(self, from: Any) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def build_flowable(self, flowable: Flux[Any]) -> Flux[int]:
        raise NotImplementedError  # TODO: translate from Java

    def produce_message(self, map: dict[str, Any]) -> CompletableFuture[MessageId]:
        raise NotImplementedError  # TODO: translate from Java

    def process_timestamp(self, timestamp: Any) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def get_producer_builder(self, client: PulsarClient) -> ProducerBuilder[T]:
        ...

    @abstractmethod
    def create_message_with_value(self, rendered_map: dict[str, Any]) -> TypedMessageBuilder[T]:
        ...
