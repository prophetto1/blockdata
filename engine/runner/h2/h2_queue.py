from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\runner\h2\H2Queue.java
# WARNING: Unresolved types: ApplicationContext, Class, DSLContext, Record, T

from dataclasses import dataclass
from typing import Any

from engine.core.models.conditions.condition import Condition
from engine.jdbc.runner.jdbc_queue import JdbcQueue
from engine.core.models.collectors.result import Result


@dataclass(slots=True, kw_only=True)
class H2Queue(JdbcQueue):

    def build_type_condition(self, type: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def receive_fetch(self, ctx: DSLContext, consumer_group: str, queue_type: str, for_update: bool) -> Result[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def do_update_group_offsets(self, ctx: DSLContext, consumer_group: str, queue_type: str, offsets: list[int]) -> None:
        raise NotImplementedError  # TODO: translate from Java
