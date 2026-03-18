from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\JdbcQueue.java
# WARNING: Unresolved types: Step

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from logging import Logger, getLogger
from datetime import timedelta
from typing import Any, Callable, ClassVar

from engine.core.models.executions.metrics.counter import Counter
from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.executor.executor_service import ExecutorService
from engine.jdbc.runner.jdbc_queue_indexer import JdbcQueueIndexer
from engine.jdbc.jooq_dsl_context_wrapper import JooqDSLContextWrapper
from engine.jdbc.runner.message_protection_configuration import MessageProtectionConfiguration
from engine.core.metrics.metric_registry import MetricRegistry
from engine.core.queues.queue_exception import QueueException
from engine.core.queues.queue_interface import QueueInterface
from engine.core.queues.queue_service import QueueService


@dataclass(slots=True, kw_only=True)
class JdbcQueue(ABC):
    mapper: ClassVar[ObjectMapper]
    max_async_threads: ClassVar[int]
    key_field: ClassVar[Field[Any]]
    offset_field: ClassVar[Field[Any]]
    consumer_group_field: ClassVar[Field[Any]]
    type_field: ClassVar[Field[Any]]
    is_closed: bool
    is_paused: bool
    logger: ClassVar[Logger] = getLogger(__name__)
    pool_executor: ExecutorService | None = None
    async_pool_executor: ExecutorService | None = None
    queue_service: QueueService | None = None
    cls: type[T] | None = None
    dsl_context_wrapper: JooqDSLContextWrapper | None = None
    configuration: Configuration | None = None
    message_protection_configuration: MessageProtectionConfiguration | None = None
    metric_registry: MetricRegistry | None = None
    table: Table[Record] | None = None
    jdbc_queue_indexer: JdbcQueueIndexer | None = None
    immediate_repoll: bool | None = None
    big_message_counter: Counter | None = None

    def produce_fields(self, consumer_group: str, key: str, message: T) -> dict[Field[Any], Any]:
        raise NotImplementedError  # TODO: translate from Java

    def produce(self, consumer_group: str, key: str, message: T, skip_indexer: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def emit_only(self, consumer_group: str, message: T) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def emit(self, consumer_group: str, message: T) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def emit_async(self, consumer_group: str, messages: list[T]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, consumer_group: str, message: T) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_key(self, key: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def queue_type(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_keys(self, keys: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def receive_fetch(self, ctx: DSLContext, consumer_group: str, offset: int, for_update: bool | None = None) -> Result[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def update_group_offsets(self, ctx: DSLContext, consumer_group: str, queue_type: str, offsets: list[int]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def do_update_group_offsets(self, ctx: DSLContext, consumer_group: str, queue_type: str, offsets: list[int]) -> None:
        ...

    @abstractmethod
    def build_type_condition(self, type: str) -> Condition:
        ...

    def receive(self, consumer_group: str, queue_type: type[Any], consumer: Callable[Either[T, DeserializationException]], for_update: bool | None = None) -> Callable:
        raise NotImplementedError  # TODO: translate from Java

    def receive_batch(self, consumer_group: str, queue_type: type[Any], consumer: Callable[list[Either[T, DeserializationException]]] | None = None, for_update: bool | None = None) -> Callable:
        raise NotImplementedError  # TODO: translate from Java

    def receive_transaction(self, consumer_group: str, queue_type: type[Any], consumer: Callable[DSLContext, list[Either[T, DeserializationException]]]) -> Callable:
        raise NotImplementedError  # TODO: translate from Java

    def receive_impl(self, consumer_group: str, queue_type: type[Any], consumer: Callable[DSLContext, list[Either[T, DeserializationException]]], in_transaction: bool, for_update: bool) -> Callable:
        raise NotImplementedError  # TODO: translate from Java

    def queue_name(self, queue_type: type[Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def poll(self, runnable: Callable[int]) -> Callable:
        raise NotImplementedError  # TODO: translate from Java

    def map(self, fetch: Result[Record]) -> list[Either[T, DeserializationException]]:
        raise NotImplementedError  # TODO: translate from Java

    def send(self, fetch: Result[Record], consumer: Callable[Either[T, DeserializationException]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def pause(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def resume(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Configuration:
        min_poll_interval: timedelta
        max_poll_interval: timedelta
        poll_switch_interval: timedelta
        poll_size: int = 100
        switch_steps: int = 5

        def compute_steps(self) -> list[Step]:
            raise NotImplementedError  # TODO: translate from Java

        @dataclass(slots=True)
        class Step:
            poll_interval: timedelta | None = None
            switch_interval: timedelta | None = None

            def compare_to(self, o: Step) -> int:
                raise NotImplementedError  # TODO: translate from Java
