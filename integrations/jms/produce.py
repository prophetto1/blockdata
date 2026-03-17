from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jms\src\main\java\io\kestra\plugin\jms\Produce.java
# WARNING: Unresolved types: AbstractSession, Exception, Flux, From, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.jms.abstract_jms_task import AbstractJmsTask
from integrations.pulsar.abstract_producer import AbstractProducer
from integrations.datagen.data import Data
from integrations.jms.j_m_s_destination import JMSDestination
from integrations.jms.j_m_s_message import JMSMessage
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Produce(AbstractJmsTask):
    """Publish messages to a JMS destination"""
    destination: JMSDestination
    from: Any
    priority: Property[int] = Property.ofValue(4)
    delivery_mode: Property[int] = Property.ofValue(2)
    time_to_live: Property[int] = Property.ofValue(0L)
    serde_type: SerdeType = SerdeType.STRING

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def send(self, session: AbstractSession, producer: AbstractProducer, message: JMSMessage, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def process_from(self, run_context: RunContext) -> Flux[JMSMessage]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages_count: int | None = None
