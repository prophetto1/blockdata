from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\debug\Breakpoint.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Breakpoint:
    id: str
    value: str | None = None

    @staticmethod
    def of(breakpoint: str) -> Breakpoint:
        raise NotImplementedError  # TODO: translate from Java
