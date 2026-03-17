from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Type(str, Enum):
    counter = "counter"
    timer = "timer"


@dataclass(slots=True, kw_only=True)
class Metric:
    type: Type | None = None
    metric: str | None = None
    value: float | None = None
    tags: dict[String, Object] | None = None
