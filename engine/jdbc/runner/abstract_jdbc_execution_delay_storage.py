from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\AbstractJdbcExecutionDelayStorage.java
# WARNING: Unresolved types: Consumer, Field, Temporal, io, jdbc, kestra

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.runners.execution_delay import ExecutionDelay


@dataclass(slots=True, kw_only=True)
class AbstractJdbcExecutionDelayStorage(AbstractJdbcRepository):
    d_a_t_e__f_i_e_l_d: Field[Any] = DSL.field(DSL.quotedName("date"))
    jdbc_repository: io.kestra.jdbc.AbstractJdbcRepository[ExecutionDelay] | None = None

    def get(self, consumer: Consumer[ExecutionDelay]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_now(self) -> Temporal:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, execution_delay: ExecutionDelay) -> None:
        raise NotImplementedError  # TODO: translate from Java
