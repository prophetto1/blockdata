from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\job\task\RunJobTaskSetting.java
# WARNING: Unresolved types: RunJobTask

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class RunJobTaskSetting:
    job_id: Property[str] | None = None
    job_parameters: Any | None = None

    def to_run_job_task(self, run_context: RunContext) -> RunJobTask:
        raise NotImplementedError  # TODO: translate from Java
