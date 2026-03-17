from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\RetryUtils.java
# WARNING: Unresolved types: BiPredicate, Class, E, Exception, ExecutionAttemptedEvent, FailsafeExecutor, FallbackBuilder, Function, Logger, Predicate, RetryPolicyBuilder, T, Throwable

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.models.tasks.retrys.abstract_retry import AbstractRetry


@dataclass(slots=True, kw_only=True)
class RetryUtils:

    @staticmethod
    def of() -> Instance[T, E]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(policy: AbstractRetry) -> Instance[T, E]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(policy: AbstractRetry, failure_function: Function[RetryFailed, E]) -> Instance[T, E]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(policy: AbstractRetry, logger: Logger) -> Instance[T, E]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Instance:
        policy: AbstractRetry = Exponential.builder()
            .delayFactor(2.0)
            .interval(Duration.ofSeconds(1))
            .maxInterval(Duration.ofSeconds(10))
            .maxAttempts(3)
            .build()
        logger: Logger = log
        failure_function: Function[RetryFailed, E] | None = None

        def run(self, exception: Class[E], run: CheckedSupplier[T]) -> T:
            raise NotImplementedError  # TODO: translate from Java

        def run(self, list: list[Class[Any]], run: CheckedSupplier[T]) -> T:
            raise NotImplementedError  # TODO: translate from Java

        def run_retry_if(self, predicate: Predicate[Throwable], run: CheckedSupplier[T]) -> T:
            raise NotImplementedError  # TODO: translate from Java

        def run(self, predicate: BiPredicate[T, Throwable], run: CheckedSupplier[T]) -> T:
            raise NotImplementedError  # TODO: translate from Java

        def run(self, predicate: Predicate[T], run: CheckedSupplier[T]) -> T:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def wrap(failsafe_executor: FailsafeExecutor[T], run: CheckedSupplier[T]) -> T:
            raise NotImplementedError  # TODO: translate from Java

        def exception_fallback(self, failure_function: Function[RetryFailed, E]) -> FallbackBuilder[T]:
            raise NotImplementedError  # TODO: translate from Java

        def to_policy(self, abstract_retry: AbstractRetry) -> RetryPolicyBuilder[T]:
            raise NotImplementedError  # TODO: translate from Java

        def final_method(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    class CheckedSupplier(Protocol):
        def get(self) -> T: ...

    @dataclass(slots=True)
    class RetryFailed(Exception):
        serial_version_u_i_d: int = 1
        attempt_count: int | None = None
        elapsed_time: timedelta | None = None
