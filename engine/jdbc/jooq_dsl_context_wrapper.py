from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\JooqDSLContextWrapper.java
# WARNING: Unresolved types: DSLContext, E, Instance, Predicate, RuntimeException, T, Throwable, TransactionalCallable, TransactionalRunnable

from dataclasses import dataclass
from typing import Any

from engine.core.utils.retry_utils import RetryUtils


@dataclass(slots=True, kw_only=True)
class JooqDSLContextWrapper:
    dsl_context: DSLContext | None = None

    def retryer(self) -> RetryUtils.Instance[T, RuntimeException]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def predicate() -> Predicate[E]:
        raise NotImplementedError  # TODO: translate from Java

    def transaction(self, transactional: TransactionalRunnable) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def transaction_result(self, transactional: TransactionalCallable[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java
