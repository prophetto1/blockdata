from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\AbstractJdbcConcurrencyLimitStorage.java
# WARNING: Unresolved types: Pair

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, Callable, ClassVar, Optional

from engine.jdbc.runner.abstract_jdbc_execution_queued_storage import AbstractJdbcExecutionQueuedStorage
from engine.jdbc.repository.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.runners.concurrency_limit import ConcurrencyLimit
from engine.core.models.executions.execution import Execution
from engine.core.runners.execution_running import ExecutionRunning
from engine.core.models.flows.flow_interface import FlowInterface


@dataclass(slots=True, kw_only=True)
class AbstractJdbcConcurrencyLimitStorage(AbstractJdbcRepository):
    logger: ClassVar[Logger] = getLogger(__name__)
    jdbc_repository: io.kestra.jdbc.AbstractJdbcRepository[ConcurrencyLimit] | None = None

    def count_then_process(self, flow: FlowInterface, consumer: Callable[DSLContext, ConcurrencyLimit, Pair[ExecutionRunning, ConcurrencyLimit]]) -> ExecutionRunning:
        raise NotImplementedError  # TODO: translate from Java

    def decrement(self, flow: FlowInterface) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def decrement_and_pop(self, flow: FlowInterface, execution_queued_storage: AbstractJdbcExecutionQueuedStorage, consumer: Callable[DSLContext, io.kestra.core.models.executions.Execution]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def increment(self, dsl_context: DSLContext, flow: FlowInterface) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, tenant_id: str) -> list[ConcurrencyLimit]:
        raise NotImplementedError  # TODO: translate from Java

    def update(self, dsl_context: DSLContext, concurrency_limit: ConcurrencyLimit | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_one(self, dsl_context: DSLContext, flow: FlowInterface) -> Optional[ConcurrencyLimit]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_id(self, tenant_id: str, namespace: str, flow_id: str) -> Optional[ConcurrencyLimit]:
        raise NotImplementedError  # TODO: translate from Java
