from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\TaskRunAttempt.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.abstract_metric_entry import AbstractMetricEntry
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class TaskRunAttempt:
    state: State
    worker_id: str | None = None
    log_file: str | None = None

    def with_state(self, state: State.Type) -> TaskRunAttempt:
        raise NotImplementedError  # TODO: translate from Java
