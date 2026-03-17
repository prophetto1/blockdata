from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Await.java
# WARNING: Unresolved types: AtomicReference, BooleanSupplier, Supplier, T, TimeoutException

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class Await:
    default_sleep: ClassVar[timedelta] = Duration.ofMillis(100)

    @staticmethod
    def until(condition: BooleanSupplier) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def until(condition: BooleanSupplier, sleep: timedelta) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def until(condition: BooleanSupplier, sleep: timedelta, timeout: timedelta) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def until(error_message_in_case_of_failure: Supplier[str], condition: BooleanSupplier, sleep: timedelta, timeout: timedelta) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def until_supplier(supplier: Supplier[T], result: AtomicReference[T]) -> BooleanSupplier:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def until(supplier: Supplier[T], sleep: timedelta, timeout: timedelta) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def until(supplier: Supplier[T], sleep: timedelta) -> T:
        raise NotImplementedError  # TODO: translate from Java
