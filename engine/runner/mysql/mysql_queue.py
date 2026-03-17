from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\runner\mysql\MysqlQueue.java
# WARNING: Unresolved types: ApplicationContext, Class, DSLContext, Record, T

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.conditions.condition import Condition
from engine.jdbc.runner.jdbc_queue import JdbcQueue
from engine.core.models.collectors.result import Result


@dataclass(slots=True, kw_only=True)
class MysqlQueue(JdbcQueue):
    q_u_e_u_e__c_o_n_s_u_m_e_r_s: ClassVar[MysqlQueueConsumers] = new MysqlQueueConsumers()

    def build_type_condition(self, type: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def receive_fetch(self, ctx: DSLContext, consumer_group: str, queue_type: str, for_update: bool) -> Result[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def do_update_group_offsets(self, ctx: DSLContext, consumer_group: str, queue_type: str, offsets: list[int]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class MysqlQueueConsumers:
        c_o_n_s_u_m_e_r_s: ClassVar[set[str]]

        def all_for_consumer_not_in(self, consumer: str) -> set[str]:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def generate_combinations(elements: list[str], used: list[bool], current: list[str], results: list[str]) -> None:
            raise NotImplementedError  # TODO: translate from Java
