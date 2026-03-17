from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\runner\postgres\PostgresQueue.java

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.jdbc.runner.jdbc_queue import JdbcQueue
from engine.core.queues.queue_exception import QueueException


@dataclass(slots=True, kw_only=True)
class PostgresQueue(JdbcQueue):
    disable_seq_scan: bool = False

    def produce_fields(self, consumer_group: str, key: str, message: T) -> dict[Field[Any], Any]:
        raise NotImplementedError  # TODO: translate from Java

    def build_type_condition(self, type: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def receive_fetch(self, ctx: DSLContext, consumer_group: str, queue_type: str, for_update: bool) -> Result[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def do_update_group_offsets(self, ctx: DSLContext, consumer_group: str, queue_type: str, offsets: list[int]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def map(self, fetch: Result[Record]) -> list[Either[T, DeserializationException]]:
        raise NotImplementedError  # TODO: translate from Java
