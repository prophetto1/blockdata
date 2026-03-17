from __future__ import annotations

from typing import Any, Protocol


class DataUtils(Protocol):
    def compute_size(self, o: Any, logger: Logger) -> int: ...
