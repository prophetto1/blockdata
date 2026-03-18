from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\ArrayListTotal.java

from dataclasses import dataclass, field
from typing import Any, Callable, ClassVar


@dataclass(slots=True, kw_only=True)
class ArrayListTotal(ArrayList):
    serial_version_uid: ClassVar[int] = 1
    total: int | None = None

    @staticmethod
    def of(pageable: Pageable, list: list[T]) -> ArrayListTotal[T]:
        raise NotImplementedError  # TODO: translate from Java

    def map(self, map: Callable[T, R]) -> ArrayListTotal[R]:
        raise NotImplementedError  # TODO: translate from Java
