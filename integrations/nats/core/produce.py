from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kubernetes.models.connection import Connection
from engine.core.models.property.data import Data
from integrations.mqtt.services.message import Message
from integrations.nats.core.nats_connection import NatsConnection
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Produce(NatsConnection, RunnableTask, Data):
    """Publish messages to a NATS subject"""
    subject: str
    from: Any

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def publish(self, run_context: RunContext, connection: Connection, messages_flowable: Flux[Object]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def producer_message(self, subject: str, message: dict[String, Object]) -> Message:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        messages_count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    messages_count: int | None = None
