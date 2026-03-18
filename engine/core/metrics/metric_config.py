from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\metrics\MetricConfig.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class MetricConfig:
    prefix: str | None = None
    tags: dict[str, str] | None = None
    labels: list[str] | None = None
