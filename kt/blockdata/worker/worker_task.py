from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from blockdata.core.models.flows.state import State
from blockdata.core.models.tasks.task import Task
from blockdata.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class WorkerTask:
    task: Task
    run_context: RunContext
    execution_id: str
    task_run_id: str
    state: State = State.CREATED
    attempt_number: int = 0
    outputs: dict[str, Any] = field(default_factory=dict)
    envs: dict[str, Any] = field(default_factory=dict)
    plugin_configuration: Any = None
