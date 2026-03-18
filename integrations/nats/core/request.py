from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-nats\src\main\java\io\kestra\plugin\nats\core\Request.java
# WARNING: Unresolved types: Exception, From, JsonProcessingException, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.datagen.data import Data
from integrations.amqp.models.message import Message
from integrations.nats.core.nats_connection import NatsConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Request(NatsConnection):
    """Request/Reply over a NATS subject"""
    subject: Property[str]
    from: Any
    request_timeout: Property[timedelta] = Property.ofValue(Duration.ofMillis(5000))

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def retrieve_message(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def build_request_message(self, subject: str, message_map: dict[str, Any]) -> Message:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        response: str | None = None
