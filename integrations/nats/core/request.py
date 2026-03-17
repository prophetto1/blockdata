from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.property.data import Data
from integrations.mqtt.services.message import Message
from integrations.nats.core.nats_connection import NatsConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Request(NatsConnection, RunnableTask, Data):
    """Request/Reply over a NATS subject"""
    subject: Property[str]
    from: Any
    request_timeout: Property[timedelta]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def retrieve_message(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def build_request_message(self, subject: str, message_map: dict[String, Object]) -> Message:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        response: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    response: str | None = None
