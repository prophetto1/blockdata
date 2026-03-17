from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\PebbleLruCache.java
# WARNING: Unresolved types: Function, MeterRegistry, PebbleCache, PebbleTemplate

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.cache import Cache


@dataclass(slots=True, kw_only=True)
class PebbleLruCache:
    cache: Cache[Any, PebbleTemplate] | None = None

    def compute_if_absent(self, key: Any, mapping_function: Function[Any, Any]) -> PebbleTemplate:
        raise NotImplementedError  # TODO: translate from Java

    def invalidate_all(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def register(self, meter_registry: MeterRegistry) -> None:
        raise NotImplementedError  # TODO: translate from Java
