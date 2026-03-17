from __future__ import annotations

from typing import Any, Protocol


class EventPositionStrategy(Protocol):
    def get(self) -> EventPosition: ...
