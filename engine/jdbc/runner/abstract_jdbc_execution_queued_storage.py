from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\AbstractJdbcExecutionQueuedStorage.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Callable

from engine.jdbc.repository.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.models.executions.execution import Execution
from engine.core.runners.execution_queued import ExecutionQueued


@dataclass(slots=True, kw_only=True)
class AbstractJdbcExecutionQueuedStorage(ABC, AbstractJdbcRepository):
    jdbc_repository: io.kestra.jdbc.AbstractJdbcRepository[ExecutionQueued] | None = None

    def save(self, dsl_context: DSLContext, execution_queued: ExecutionQueued) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def pop(self, dsl_context: DSLContext, tenant_id: str, namespace: str, flow_id: str, consumer: Callable[DSLContext, Execution]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_all_for_all_tenants(self) -> list[ExecutionQueued]:
        raise NotImplementedError  # TODO: translate from Java

    def remove(self, execution: Execution) -> None:
        raise NotImplementedError  # TODO: translate from Java
