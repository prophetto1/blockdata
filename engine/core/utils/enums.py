from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Enums.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Enums:

    @staticmethod
    def get_for_name_ignore_case(value: str, enum_type: type[T], default_value: T | None = None) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def all_except(enum_type: type[T], to_exclude: set[T]) -> set[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_string(value: str, mapping: dict[str, T], type_name: str) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_list(value: Any, enum_class: type[T]) -> list[T]:
        raise NotImplementedError  # TODO: translate from Java
