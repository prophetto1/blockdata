from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.pulsar.abstract_reader import AbstractReader
from integrations.mqtt.services.message import Message
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.pulsar.subscription_interface import SubscriptionInterface


@dataclass(slots=True, kw_only=True)
class Consume(AbstractReader, RunnableTask, SubscriptionInterface):
    """Consume messages from Pulsar topics"""
    subscription_name: Property[str] | None = None
    initial_position: Property[SubscriptionInitialPosition] | None = None
    subscription_type: Property[SubscriptionType] | None = None
    consumer_properties: Property[dict[String, String]] | None = None
    encryption_key: Property[str] | None = None
    consumer_name: Property[str] | None = None

    def run(self, run_context: RunContext) -> AbstractReader:
        raise NotImplementedError  # TODO: translate from Java

    def new_consumer_builder(self, run_context: RunContext, client: PulsarClient) -> ConsumerBuilder[byte]:
        raise NotImplementedError  # TODO: translate from Java

    def build_message(self, message: Message[byte], run_context: RunContext) -> PulsarMessage:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PulsarMessage(io):
        key: str | None = None
        value: Any | None = None
        properties: dict[String, String] | None = None
        topic: str | None = None
        event_time: datetime | None = None
        message_id: str | None = None


@dataclass(slots=True, kw_only=True)
class PulsarMessage(io):
    key: str | None = None
    value: Any | None = None
    properties: dict[String, String] | None = None
    topic: str | None = None
    event_time: datetime | None = None
    message_id: str | None = None
