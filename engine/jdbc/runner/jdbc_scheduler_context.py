from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\JdbcSchedulerContext.java
# WARNING: Unresolved types: Consumer, DSLContext

from dataclasses import dataclass
from typing import Any

from engine.jdbc.jooq_dsl_context_wrapper import JooqDSLContextWrapper
from engine.core.runners.schedule_context_interface import ScheduleContextInterface


@dataclass(slots=True, kw_only=True)
class JdbcSchedulerContext:
    context: DSLContext | None = None
    dsl_context_wrapper: JooqDSLContextWrapper | None = None

    def do_in_transaction(self, consumer: Consumer[ScheduleContextInterface]) -> None:
        raise NotImplementedError  # TODO: translate from Java
