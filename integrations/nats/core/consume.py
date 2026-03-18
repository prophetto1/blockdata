from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-nats\src\main\java\io\kestra\plugin\nats\core\Consume.java
# WARNING: Unresolved types: DeliverPolicy, Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.amqp.consume_interface import ConsumeInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.amqp.models.message import Message
from integrations.nats.core.nats_connection import NatsConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.mqtt.subscribe_interface import SubscribeInterface


@dataclass(slots=True, kw_only=True)
class Consume(NatsConnection):
    """Consume NATS JetStream messages"""
    poll_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(2))
    batch_size: int = 10
    deliver_policy: Property[DeliverPolicy] = Property.ofValue(DeliverPolicy.All)
    subject: str | None = None
    durable_id: Property[str] | None = None
    since: Property[str] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def is_ended(self, messages: list[Message], max_messages_remaining: int, poll_start: datetime, run_context: RunContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages_count: int | None = None
        uri: str | None = None

    @dataclass(slots=True)
    class NatsMessageOutput:
        subject: str | None = None
        headers: dict[str, list[str]] | None = None
        data: str | None = None
        timestamp: datetime | None = None
