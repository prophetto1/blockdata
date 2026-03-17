from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.jms.abstract_jms_task import AbstractJmsTask
from integrations.pulsar.abstract_producer import AbstractProducer
from engine.core.models.property.data import Data
from integrations.jms.j_m_s_destination import JMSDestination
from integrations.jms.j_m_s_message import JMSMessage
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Produce(AbstractJmsTask, RunnableTask, Data):
    """Publish messages to a JMS destination"""
    destination: JMSDestination
    priority: Property[int] | None = None
    delivery_mode: Property[int] | None = None
    time_to_live: Property[int] | None = None
    from: Any
    serde_type: SerdeType = SerdeType.STRING

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def send(self, session: AbstractSession, producer: AbstractProducer, message: JMSMessage, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def process_from(self, run_context: RunContext) -> Flux[JMSMessage]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        messages_count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    messages_count: int | None = None
