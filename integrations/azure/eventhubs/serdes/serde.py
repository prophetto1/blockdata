from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\serdes\Serde.java

from typing import Any, Protocol


class Serde(Protocol):
    def configure(self, configs: dict[str, Any]) -> None: ...

    def serialize(self, data: Any) -> list[int]: ...

    def deserialize(self, data: list[int]) -> Any: ...
