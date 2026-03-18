from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-redis\src\main\java\io\kestra\plugin\redis\RedisConnectionInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class RedisConnectionInterface(Protocol):
    def get_url(self) -> Property[str]: ...
