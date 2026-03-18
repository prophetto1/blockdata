from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\RetryUtils.java
# WARNING: Unresolved types: ExecutionAttemptedEvent, FailsafeExecutor, FallbackBuilder, RetryPolicyBuilder

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, Callable, ClassVar, Protocol

from engine.core.models.tasks.retrys.abstract_retry import AbstractRetry


@dataclass(slots=True, kw_only=True)
class RetryUtils:

    @staticmethod
    def of(policy: AbstractRetry | None = None, failure_function: Callable[RetryFailed, E] | None = None) -> Instance[T, E]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Instance:
        policy: AbstractRetry
        logger: ClassVar[Logger] = getLogger(__name__)
        logger: Any = log
        failure_function: Callable[RetryFailed, E] | None = None

        def run(self, exception: type[E], run: CheckedSupplier[T]) -> T:
            raise NotImplementedError  # TODO: translate from Java

        def run_retry_if(self, predicate: Callable[BaseException], run: CheckedSupplier[T]) -> T:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def wrap(failsafe_executor: FailsafeExecutor[T], run: CheckedSupplier[T]) -> T:
            raise NotImplementedError  # TODO: translate from Java

        def exception_fallback(self, failure_function: Callable[RetryFailed, E]) -> FallbackBuilder[T]:
            raise NotImplementedError  # TODO: translate from Java

        def to_policy(self, abstract_retry: AbstractRetry) -> RetryPolicyBuilder[T]:
            raise NotImplementedError  # TODO: translate from Java

        def final_method(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    class CheckedSupplier(Protocol):
        def get(self) -> T: ...

    @dataclass(slots=True)
    class RetryFailed(Exception):
        serial_version_uid: ClassVar[int] = 1
        attempt_count: int | None = None
        elapsed_time: timedelta | None = None
