from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.amqp.abstract_amqp_connection import AbstractAmqpConnection
from engine.core.models.property.data import Data
from integrations.mqtt.services.message import Message
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Publish(AbstractAmqpConnection, RunnableTask, Data):
    """Publish a message to an AMQP exchange."""
    exchange: Property[str]
    routing_key: Property[str] | None = None
    from: Any
    serde_type: Property[SerdeType] | None = None

    def run(self, run_context: RunContext) -> Publish:
        raise NotImplementedError  # TODO: translate from Java

    def build_flowable(self, flowable: Flux[Message], channel: Channel, run_context: RunContext) -> Flux[Integer]:
        raise NotImplementedError  # TODO: translate from Java

    def publish(self, channel: Channel, message: Message, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        messages_count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    messages_count: int | None = None
