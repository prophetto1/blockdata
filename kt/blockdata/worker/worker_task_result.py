from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from blockdata.core.models.flows.state import State


@dataclass(slots=True, kw_only=True)
class WorkerTaskResult:
    execution_id: str
    task_run_id: str
    state: State
    attempt_number: int
    output: Any = None
    metrics: dict[str, Any] = field(default_factory=dict)
    duration_ms: int = 0
    error: str | None = None
    logs: list[str] = field(default_factory=list)
