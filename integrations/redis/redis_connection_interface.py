from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class RedisConnectionInterface(Protocol):
    def get_url(self) -> Property[str]: ...
