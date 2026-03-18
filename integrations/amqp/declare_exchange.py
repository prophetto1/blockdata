from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-amqp\src\main\java\io\kestra\plugin\amqp\DeclareExchange.java
# WARNING: Unresolved types: BuiltinExchangeType, Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.amqp.abstract_amqp_connection import AbstractAmqpConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DeclareExchange(AbstractAmqpConnection):
    """Create an AMQP exchange."""
    name: Property[str]
    exchange_type: Property[BuiltinExchangeType] = Property.ofValue(BuiltinExchangeType.DIRECT)
    durability: Property[bool] = Property.ofValue(true)
    auto_delete: Property[bool] = Property.ofValue(false)
    internal: Property[bool] = Property.ofValue(false)
    args: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        exchange: str | None = None
