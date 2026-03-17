from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.jms.abstract_jms_task import AbstractJmsTask
from integrations.jms.j_m_s_destination import JMSDestination
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Consume(AbstractJmsTask, RunnableTask):
    """Consume messages from a JMS destination"""
    destination: JMSDestination
    message_selector: str | None = None
    serde_type: Property[SerdeType] | None = None
    max_messages: Property[int] | None = None
    max_wait_timeout: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def ended(self, count: AtomicInteger, r_max_messages: int) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        count: int | None = None
        uri: str | None = None

    @dataclass(slots=True)
    class ConsumeRunner(AutoCloseable):
        connection: ConnectionAdapter | None = None
        session: SessionAdapter | None = None
        message_consumer: ConsumerAdapter | None = None
        r_serde_type: SerdeType | None = None
        r_max_wait_timeout: int | None = None

        def run(self, message_processor: java, end_condition: java) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def close(self) -> None:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    count: int | None = None
    uri: str | None = None


@dataclass(slots=True, kw_only=True)
class ConsumeRunner(AutoCloseable):
    connection: ConnectionAdapter | None = None
    session: SessionAdapter | None = None
    message_consumer: ConsumerAdapter | None = None
    r_serde_type: SerdeType | None = None
    r_max_wait_timeout: int | None = None

    def run(self, message_processor: java, end_condition: java) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
