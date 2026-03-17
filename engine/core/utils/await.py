from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Await.java
# WARNING: Unresolved types: AtomicReference, BooleanSupplier

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, Callable, ClassVar


@dataclass(slots=True, kw_only=True)
class Await:
    default_sleep: ClassVar[timedelta]

    @staticmethod
    def until(error_message_in_case_of_failure: Callable[str], condition: BooleanSupplier | None = None, sleep: timedelta | None = None, timeout: timedelta | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def until_supplier(supplier: Callable[T], result: AtomicReference[T]) -> BooleanSupplier:
        raise NotImplementedError  # TODO: translate from Java
