from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\services\JdbcConcurrencyLimitService.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_concurrency_limit_storage import AbstractJdbcConcurrencyLimitStorage
from engine.jdbc.runner.abstract_jdbc_execution_queued_storage import AbstractJdbcExecutionQueuedStorage
from engine.core.runners.concurrency_limit import ConcurrencyLimit
from engine.core.services.concurrency_limit_service import ConcurrencyLimitService
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class JdbcConcurrencyLimitService:
    execution_queued_storage: AbstractJdbcExecutionQueuedStorage | None = None
    concurrency_limit_storage: AbstractJdbcConcurrencyLimitStorage | None = None

    def unqueue(self, execution: Execution, state: State.Type) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, tenant_id: str) -> list[ConcurrencyLimit]:
        raise NotImplementedError  # TODO: translate from Java

    def update(self, concurrency_limit: ConcurrencyLimit) -> ConcurrencyLimit:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_id(self, tenant_id: str, namespace: str, flow_id: str) -> Optional[ConcurrencyLimit]:
        raise NotImplementedError  # TODO: translate from Java
