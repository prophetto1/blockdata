from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\ListUtils.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ListUtils:

    @staticmethod
    def empty_on_null(list: list[T]) -> list[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_empty(list: list[T]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def concat(list1: list[T], list2: list[T]) -> list[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def convert_to_list(object: Any) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def convert_to_list_string(object: Any) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def partition(list: list[T], size: int) -> list[list[T]]:
        raise NotImplementedError  # TODO: translate from Java
