from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Rethrow.java

from dataclasses import dataclass
from typing import Any, Callable, Protocol


@dataclass(slots=True, kw_only=True)
class Rethrow:

    @staticmethod
    def throw_consumer(consumer: ConsumerChecked[T, E]) -> Callable[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def throw_bi_consumer(consumer: BiConsumerChecked[K, V, E]) -> Callable[K, V]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def throw_supplier(supplier: SupplierChecked[T, E]) -> Callable[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def throw_predicate(consumer: PredicateChecked[T, E]) -> Callable[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def throw_function(function: FunctionChecked[T, R, E]) -> Callable[T, R]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def throw_bi_function(function: BiFunctionChecked[A, B, R, E]) -> Callable[A, B, R]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def throw_runnable(runnable: RunnableChecked[E]) -> Callable:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def throw_exception(exception: Exception) -> R:
        raise NotImplementedError  # TODO: translate from Java

    class ConsumerChecked(Protocol):
        def accept(self, t: T) -> None: ...

    class SupplierChecked(Protocol):
        def get(self) -> T: ...

    class BiConsumerChecked(Protocol):
        def accept(self, k: K, v: V) -> None: ...

    class FunctionChecked(Protocol):
        def apply(self, t: T) -> R: ...

    class BiFunctionChecked(Protocol):
        def apply(self, a: A, b: B) -> R: ...

    class PredicateChecked(Protocol):
        def test(self, t: T) -> bool: ...

    class RunnableChecked(Protocol):
        def run(self) -> None: ...

    class CallableChecked(Protocol):
        def call(self) -> R: ...
