from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\ReadOnlyDelegatingMap.java
# WARNING: Unresolved types: Entry, K, V

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ReadOnlyDelegatingMap:

    def get_delegate(self) -> dict[K, V]:
        raise NotImplementedError  # TODO: translate from Java

    def size(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def is_empty(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def contains_key(self, key: Any) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def contains_value(self, value: Any) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get(self, key: Any) -> V:
        raise NotImplementedError  # TODO: translate from Java

    def put(self, key: K, value: V) -> V:
        raise NotImplementedError  # TODO: translate from Java

    def remove(self, key: Any) -> V:
        raise NotImplementedError  # TODO: translate from Java

    def put_all(self, m: dict[Any, Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def clear(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def key_set(self) -> set[K]:
        raise NotImplementedError  # TODO: translate from Java

    def values(self) -> list[V]:
        raise NotImplementedError  # TODO: translate from Java

    def entry_set(self) -> set[Entry[K, V]]:
        raise NotImplementedError  # TODO: translate from Java
