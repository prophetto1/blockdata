from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\cache\NoopCache.java
# WARNING: Unresolved types: CacheStats, ConcurrentHashMap, ConcurrentMap, Policy

from dataclasses import dataclass, field
from typing import Any, Callable, ClassVar, Iterable

from engine.core.models.tasks.cache import Cache


@dataclass(slots=True, kw_only=True)
class NoopCache:
    empty_map: ClassVar[ConcurrentMap[Any, Any]]

    def get_if_present(self, key: K) -> V:
        raise NotImplementedError  # TODO: translate from Java

    def get(self, key: K, mapping_function: Callable[Any, Any]) -> V:
        raise NotImplementedError  # TODO: translate from Java

    def get_all_present(self, keys: Iterable[Any]) -> dict[K, @NonNull V]:
        raise NotImplementedError  # TODO: translate from Java

    def get_all(self, keys: Iterable[Any], mapping_function: Callable[Any, Any]) -> dict[K, @NonNull V]:
        raise NotImplementedError  # TODO: translate from Java

    def put(self, key: K, value: V) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def put_all(self, map: dict[Any, Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def invalidate(self, key: K) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def invalidate_all(self, keys: Iterable[Any] | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def estimated_size(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def stats(self) -> CacheStats:
        raise NotImplementedError  # TODO: translate from Java

    def as_map(self) -> ConcurrentMap[K, @NonNull V]:
        raise NotImplementedError  # TODO: translate from Java

    def clean_up(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def policy(self) -> Policy[K, @NonNull V]:
        raise NotImplementedError  # TODO: translate from Java
