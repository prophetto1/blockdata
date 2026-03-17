from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-amqp\src\main\java\io\kestra\plugin\amqp\CreateQueue.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.amqp.abstract_amqp_connection import AbstractAmqpConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateQueue(AbstractAmqpConnection):
    """Create an AMQP queue."""
    name: Property[str]
    durability: Property[bool] = Property.ofValue(true)
    exclusive: Property[bool] = Property.ofValue(false)
    auto_delete: Property[bool] = Property.ofValue(false)
    args: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        queue: str | None = None
