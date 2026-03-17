from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\AutocompleteUtils.java
# WARNING: Unresolved types: Function, HttpStatusException, R, T

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AutocompleteUtils:

    @staticmethod
    def map(map: Function[T, R]) -> list[R]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from() -> list[T]:
        raise NotImplementedError  # TODO: translate from Java
