from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Metric:
    identity: str | None = None
    metric_name: str | None = None
    value: Any | None = None
