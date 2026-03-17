from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\job\task\SparkSubmitTaskSetting.java
# WARNING: Unresolved types: SparkSubmitTask

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SparkSubmitTaskSetting:
    parameters: Any | None = None

    def to_spark_submit_task(self, run_context: RunContext) -> SparkSubmitTask:
        raise NotImplementedError  # TODO: translate from Java
