from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\killswitch\KillSwitchService.java

from dataclasses import dataclass
from typing import Any

from engine.core.killswitch.evaluation_type import EvaluationType
from engine.core.models.executions.execution import Execution
from engine.core.services.ignore_execution_service import IgnoreExecutionService
from engine.core.models.executions.task_run import TaskRun


@dataclass(slots=True, kw_only=True)
class KillSwitchService:
    ignore_execution_service: IgnoreExecutionService | None = None

    def evaluate(self, execution_id: str) -> EvaluationType:
        raise NotImplementedError  # TODO: translate from Java
