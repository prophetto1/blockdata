from __future__ import annotations

from typing import Any, Protocol


class Callback(Protocol):
    def run(self) -> None: ...
