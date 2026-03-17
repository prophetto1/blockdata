from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\models\TaskConstraints.java
# WARNING: Unresolved types: azure, batch, com, microsoft, models, protocol

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class TaskConstraints:
    max_wall_clock_time: Property[timedelta] | None = None
    retention_time: Property[timedelta] | None = None
    max_task_retry_count: Property[int] | None = None

    def to(self, run_context: RunContext) -> com.microsoft.azure.batch.protocol.models.TaskConstraints:
        raise NotImplementedError  # TODO: translate from Java
