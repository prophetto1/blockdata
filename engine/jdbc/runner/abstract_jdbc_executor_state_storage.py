from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\AbstractJdbcExecutorStateStorage.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.models.executions.execution import Execution
from engine.core.runners.executor_state import ExecutorState


@dataclass(slots=True, kw_only=True)
class AbstractJdbcExecutorStateStorage(ABC):
    jdbc_repository: io.kestra.jdbc.AbstractJdbcRepository[ExecutorState] | None = None

    def get(self, dsl_context: DSLContext, execution: Execution) -> ExecutorState:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, dsl_context: DSLContext, executor_state: ExecutorState) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, execution: Execution) -> None:
        raise NotImplementedError  # TODO: translate from Java
