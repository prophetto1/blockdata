from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Enums.java
# WARNING: Unresolved types: Class, Enum, T

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Enums:

    @staticmethod
    def get_for_name_ignore_case(value: str, enum_type: Class[T], default_value: T) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_for_name_ignore_case(value: str, enum_type: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_for_name_ignore_case(value: str, enum_type: Class[T], fallback: dict[str, T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def all_except(enum_type: Class[T], to_exclude: set[T]) -> set[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_string(value: str, mapping: dict[str, T], type_name: str) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_list(value: Any, enum_class: Class[T]) -> list[T]:
        raise NotImplementedError  # TODO: translate from Java
