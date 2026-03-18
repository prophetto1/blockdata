from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\trace\TracesConfiguration.java

from dataclasses import dataclass
from typing import Any

from engine.core.trace.trace_level import TraceLevel


@dataclass(slots=True, kw_only=True)
class TracesConfiguration:
    root: TraceLevel | None = None
    categories: dict[str, TraceLevel] | None = None
