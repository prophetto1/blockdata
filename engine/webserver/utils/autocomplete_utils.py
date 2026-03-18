from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\AutocompleteUtils.java

from dataclasses import dataclass
from typing import Any, Callable


@dataclass(slots=True, kw_only=True)
class AutocompleteUtils:

    @staticmethod
    def map(map: Callable[T, R]) -> list[R]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from() -> list[T]:
        raise NotImplementedError  # TODO: translate from Java
