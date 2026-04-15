from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class ExecutionResult:
    response_text: str
    backend: str
    model_name: str | None
    provider: str | None
    usage: dict[str, Any] | None
    timing_ms: float | None
