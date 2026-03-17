from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.amqp.abstract_amqp_connection import AbstractAmqpConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DeclareExchange(AbstractAmqpConnection, RunnableTask):
    """Create an AMQP exchange."""
    name: Property[str]
    exchange_type: Property[BuiltinExchangeType] | None = None
    durability: Property[bool] | None = None
    auto_delete: Property[bool] | None = None
    internal: Property[bool] | None = None
    args: Property[dict[String, Object]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        exchange: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    exchange: str | None = None
