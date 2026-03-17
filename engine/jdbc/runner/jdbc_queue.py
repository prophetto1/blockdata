from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\JdbcQueue.java
# WARNING: Unresolved types: ApplicationContext, AtomicBoolean, BiConsumer, Class, Comparable, Consumer, DSLContext, Field, IOException, ObjectMapper, Record, Runnable, Step, Supplier, T

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.models.conditions.condition import Condition
from engine.core.models.executions.metrics.counter import Counter
from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.executor.executor_service import ExecutorService
from engine.jdbc.runner.jdbc_queue_indexer import JdbcQueueIndexer
from engine.jdbc.jooq_d_s_l_context_wrapper import JooqDSLContextWrapper
from engine.jdbc.runner.message_protection_configuration import MessageProtectionConfiguration
from engine.core.metrics.metric_registry import MetricRegistry
from engine.core.queues.queue_exception import QueueException
from engine.core.queues.queue_interface import QueueInterface
from engine.core.queues.queue_service import QueueService
from engine.core.models.collectors.result import Result
from engine.plugin.core.dashboard.chart.table import Table


@dataclass(slots=True, kw_only=True)
class JdbcQueue:
    m_a_p_p_e_r: ObjectMapper = JdbcMapper.of()
    m_a_x__a_s_y_n_c__t_h_r_e_a_d_s: int = Runtime.getRuntime().availableProcessors()
    k_e_y__f_i_e_l_d: Field[Any] = AbstractJdbcRepository.field("key")
    o_f_f_s_e_t__f_i_e_l_d: Field[Any] = AbstractJdbcRepository.field("offset")
    c_o_n_s_u_m_e_r__g_r_o_u_p__f_i_e_l_d: Field[Any] = AbstractJdbcRepository.field("consumer_group")
    t_y_p_e__f_i_e_l_d: Field[Any] = AbstractJdbcRepository.field("type")
    is_closed: AtomicBoolean = new AtomicBoolean(false)
    is_paused: AtomicBoolean = new AtomicBoolean(false)
    pool_executor: ExecutorService | None = None
    async_pool_executor: ExecutorService | None = None
    queue_service: QueueService | None = None
    cls: Class[T] | None = None
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

    def receive_fetch(self, ctx: DSLContext, consumer_group: str, offset: int) -> Result[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def receive_fetch(self, ctx: DSLContext, consumer_group: str, offset: int, for_update: bool) -> Result[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def receive_fetch(self, ctx: DSLContext, consumer_group: str, queue_type: str) -> Result[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def update_group_offsets(self, ctx: DSLContext, consumer_group: str, queue_type: str, offsets: list[int]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def receive_fetch(self, ctx: DSLContext, consumer_group: str, queue_type: str, for_update: bool) -> Result[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def do_update_group_offsets(self, ctx: DSLContext, consumer_group: str, queue_type: str, offsets: list[int]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def build_type_condition(self, type: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def receive(self, consumer_group: str, consumer: Consumer[Either[T, DeserializationException]], for_update: bool) -> Runnable:
        raise NotImplementedError  # TODO: translate from Java

    def receive(self, consumer_group: str, queue_type: Class[Any], consumer: Consumer[Either[T, DeserializationException]], for_update: bool) -> Runnable:
        raise NotImplementedError  # TODO: translate from Java

    def receive_batch(self, queue_type: Class[Any], consumer: Consumer[list[Either[T, DeserializationException]]]) -> Runnable:
        raise NotImplementedError  # TODO: translate from Java

    def receive_batch(self, consumer_group: str, queue_type: Class[Any], consumer: Consumer[list[Either[T, DeserializationException]]]) -> Runnable:
        raise NotImplementedError  # TODO: translate from Java

    def receive_batch(self, consumer_group: str, queue_type: Class[Any], consumer: Consumer[list[Either[T, DeserializationException]]], for_update: bool) -> Runnable:
        raise NotImplementedError  # TODO: translate from Java

    def receive_transaction(self, consumer_group: str, queue_type: Class[Any], consumer: BiConsumer[DSLContext, list[Either[T, DeserializationException]]]) -> Runnable:
        raise NotImplementedError  # TODO: translate from Java

    def receive_impl(self, consumer_group: str, queue_type: Class[Any], consumer: BiConsumer[DSLContext, list[Either[T, DeserializationException]]], in_transaction: bool, for_update: bool) -> Runnable:
        raise NotImplementedError  # TODO: translate from Java

    def queue_name(self, queue_type: Class[Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def poll(self, runnable: Supplier[int]) -> Runnable:
        raise NotImplementedError  # TODO: translate from Java

    def map(self, fetch: Result[Record]) -> list[Either[T, DeserializationException]]:
        raise NotImplementedError  # TODO: translate from Java

    def send(self, fetch: Result[Record], consumer: Consumer[Either[T, DeserializationException]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def pause(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def resume(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Configuration:
        min_poll_interval: timedelta = Duration.ofMillis(25)
        max_poll_interval: timedelta = Duration.ofMillis(500)
        poll_switch_interval: timedelta = Duration.ofSeconds(60)
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
