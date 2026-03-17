from __future__ import annotations

from typing import Any, Protocol


class Producer(Protocol):
    def produce(self) -> T: ...
