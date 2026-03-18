from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mqtt\src\main\java\io\kestra\plugin\mqtt\SubscribeInterface.java

from typing import Any, Protocol


class SubscribeInterface(Protocol):
    def get_topic(self) -> Any: ...
