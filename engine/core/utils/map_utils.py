from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\MapUtils.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class MapUtils:
    logger: ClassVar[Logger] = getLogger(__name__)
    conflict_at_key_msg: ClassVar[str] = "Conflict at key: '{}', ignoring it. Map keys are: {}"

    @staticmethod
    def merge(a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def deep_merge(a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def merge_values(value_a: Any, value_b: Any) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def deep_clone_map(original: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def deep_clone(value: Any) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def merge_collections(col_a: list[Any], col_b: list[Any]) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def clone_collection(elements: list[Any]) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def cast_map(map: dict[Any, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def merge_with_nullable_values() -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def empty_on_null(map: dict[K, V]) -> dict[K, V]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_empty(map: dict[Any, Any]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def flatten_to_nested_map(flat_map: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def nested_to_flatten_map(nested_map: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def flatten_entry(key: str, value: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
