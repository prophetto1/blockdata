from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jms\src\main\java\io\kestra\plugin\jms\Consume.java
# WARNING: Unresolved types: AtomicInteger, AutoCloseable, ConnectionAdapter, Consumer, ConsumerAdapter, Exception, SessionAdapter, Supplier, core, function, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.jms.abstract_jms_task import AbstractJmsTask
from integrations.jms.j_m_s_destination import JMSDestination
from integrations.jms.j_m_s_message import JMSMessage
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Consume(AbstractJmsTask):
    """Consume messages from a JMS destination"""
    destination: JMSDestination
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    max_messages: Property[int] = Property.ofValue(1)
    max_wait_timeout: Property[int] = Property.ofValue(0L)
    message_selector: str | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def ended(self, count: AtomicInteger, r_max_messages: int) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int | None = None
        uri: str | None = None

    @dataclass(slots=True)
    class ConsumeRunner:
        connection: ConnectionAdapter | None = None
        session: SessionAdapter | None = None
        message_consumer: ConsumerAdapter | None = None
        r_serde_type: SerdeType | None = None
        r_max_wait_timeout: int | None = None

        def run(self, message_processor: java.util.function.Consumer[JMSMessage], end_condition: java.util.function.Supplier[bool]) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def close(self) -> None:
            raise NotImplementedError  # TODO: translate from Java
