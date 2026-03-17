from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\runner\mysql\MysqlQueue.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.jdbc.runner.jdbc_queue import JdbcQueue


@dataclass(slots=True, kw_only=True)
class MysqlQueue(JdbcQueue):
    queue_consumers: ClassVar[MysqlQueueConsumers]

    def build_type_condition(self, type: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def receive_fetch(self, ctx: DSLContext, consumer_group: str, queue_type: str, for_update: bool) -> Result[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def do_update_group_offsets(self, ctx: DSLContext, consumer_group: str, queue_type: str, offsets: list[int]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class MysqlQueueConsumers:
        consumers: ClassVar[set[str]]

        def all_for_consumer_not_in(self, consumer: str) -> set[str]:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def generate_combinations(elements: list[str], used: list[bool], current: list[str], results: list[str]) -> None:
            raise NotImplementedError  # TODO: translate from Java
