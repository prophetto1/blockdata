from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\ArrayListTotal.java
# WARNING: Unresolved types: Function, Pageable, R, T

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class ArrayListTotal(ArrayList):
    serial_version_u_i_d: ClassVar[int] = 1
    total: int | None = None

    @staticmethod
    def of(pageable: Pageable, list: list[T]) -> ArrayListTotal[T]:
        raise NotImplementedError  # TODO: translate from Java

    def map(self, map: Function[T, R]) -> ArrayListTotal[R]:
        raise NotImplementedError  # TODO: translate from Java
