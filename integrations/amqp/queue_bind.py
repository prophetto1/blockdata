from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.amqp.abstract_amqp_connection import AbstractAmqpConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class QueueBind(AbstractAmqpConnection, RunnableTask):
    """Bind a queue to an AMQP exchange."""
    exchange: Property[str]
    queue: Property[str]
    routing_key: Property[str] | None = None
    args: Property[dict[String, Object]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        queue: str | None = None
        exchange: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    queue: str | None = None
    exchange: str | None = None
