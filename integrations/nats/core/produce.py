from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-nats\src\main\java\io\kestra\plugin\nats\core\Produce.java
# WARNING: Unresolved types: Exception, Flux, From, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.kubernetes.models.connection import Connection
from integrations.datagen.data import Data
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.amqp.models.message import Message
from integrations.nats.core.nats_connection import NatsConnection
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Produce(NatsConnection):
    """Publish messages to a NATS subject"""
    subject: str
    from: Any

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def publish(self, run_context: RunContext, connection: Connection, messages_flowable: Flux[Any]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def producer_message(self, subject: str, message: dict[str, Any]) -> Message:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages_count: int | None = None
