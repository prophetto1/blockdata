from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\DurationOrSizeTrigger.java

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any


@dataclass(slots=True, kw_only=True)
class DurationOrSizeTrigger:
    batch_size: int | None = None
    batch_duration: timedelta | None = None
    next: datetime | None = None

    def test(self, buffer: list[V]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def next_date(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
