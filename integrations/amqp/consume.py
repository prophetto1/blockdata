from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from datetime import timedelta

from integrations.amqp.abstract_amqp_connection import AbstractAmqpConnection
from integrations.kubernetes.models.connection import Connection
from integrations.amqp.consume_base_interface import ConsumeBaseInterface
from integrations.nats.consume_interface import ConsumeInterface
from integrations.mqtt.services.message import Message
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Consume(AbstractAmqpConnection, RunnableTask, ConsumeInterface):
    """Consume AMQP messages until a stop condition"""
    queue: Property[str] | None = None
    serde_type: Property[SerdeType] | None = None
    consumer_tag: Property[str] | None = None
    auto_ack: Property[bool] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Consume:
        raise NotImplementedError  # TODO: translate from Java

    def ended(self, count: AtomicInteger, start: datetime, max_records: int, max_duration: timedelta) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ConsumeThread(Thread, AutoCloseable):
        last_delivery_tag: AtomicReference[Long] | None = None
        exception: AtomicReference[Exception] | None = None
        end_supplier: Supplier[Boolean] | None = None
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
    class Output(io):
        count: int | None = None
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class ConsumeThread(Thread, AutoCloseable):
    last_delivery_tag: AtomicReference[Long] | None = None
    exception: AtomicReference[Exception] | None = None
    end_supplier: Supplier[Boolean] | None = None
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


@dataclass(slots=True, kw_only=True)
class Output(io):
    count: int | None = None
    uri: str | None = None
