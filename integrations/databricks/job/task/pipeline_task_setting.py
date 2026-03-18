from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\job\task\PipelineTaskSetting.java
# WARNING: Unresolved types: PipelineTask

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PipelineTaskSetting:
    pipeline_id: Property[str] | None = None
    full_refresh: Property[bool] | None = None

    def to_pipeline_task(self, run_context: RunContext) -> PipelineTask:
        raise NotImplementedError  # TODO: translate from Java
