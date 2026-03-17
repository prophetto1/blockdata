from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-amqp\src\main\java\io\kestra\plugin\amqp\Publish.java
# WARNING: Unresolved types: Channel, Exception, Flux, From, IOException, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.amqp.abstract_amqp_connection import AbstractAmqpConnection
from integrations.datagen.data import Data
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Publish(AbstractAmqpConnection):
    """Publish a message to an AMQP exchange."""
    exchange: Property[str]
    from: Any
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    routing_key: Property[str] | None = None

    def run(self, run_context: RunContext) -> Publish.Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_flowable(self, flowable: Flux[Message], channel: Channel, run_context: RunContext) -> Flux[int]:
        raise NotImplementedError  # TODO: translate from Java

    def publish(self, channel: Channel, message: Message, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages_count: int | None = None
