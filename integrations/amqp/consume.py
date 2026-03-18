from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-amqp\src\main\java\io\kestra\plugin\amqp\Consume.java
# WARNING: Unresolved types: AtomicInteger, AtomicReference, AutoCloseable, Channel, ConnectionFactory, Consumer, Exception, Supplier, Thread, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.amqp.abstract_amqp_connection import AbstractAmqpConnection
from integrations.kubernetes.models.connection import Connection
from integrations.amqp.consume_base_interface import ConsumeBaseInterface
from integrations.amqp.consume_interface import ConsumeInterface
from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Consume(AbstractAmqpConnection):
    """Consume AMQP messages until a stop condition"""
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    consumer_tag: Property[str] = Property.ofValue("Kestra")
    auto_ack: Property[bool] = Property.ofValue(false)
    queue: Property[str] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Consume.Output:
        raise NotImplementedError  # TODO: translate from Java

    def ended(self, count: AtomicInteger, start: datetime, max_records: int, max_duration: timedelta) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ConsumeThread(Thread):
        last_delivery_tag: AtomicReference[int] = new AtomicReference<>()
        exception: AtomicReference[Exception] = new AtomicReference<>()
        end_supplier: Supplier[bool] | None = None
        factory: ConnectionFactory | None = None
        run_context: RunContext | None = None
        consume_interface: ConsumeBaseInterface | None = None
        auto_ack: bool | None = None
        consumer: Consumer[Message] | None = None
        connection: Connection | None = None
        channel: Channel | None = None

        def get_exception(self) -> Exception:
            raise NotImplementedError  # TODO: translate from Java

        def run(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def close(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int | None = None
        uri: str | None = None
