from __future__ import annotations

from typing import Any, Protocol


class SubscribeInterface(Protocol):
    def get_topic(self) -> Any: ...
