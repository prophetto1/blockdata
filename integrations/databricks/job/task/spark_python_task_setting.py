from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\job\task\SparkPythonTaskSetting.java
# WARNING: Unresolved types: Source, SparkPythonTask

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SparkPythonTaskSetting:
    python_file: Property[str]
    spark_python_task_source: Property[Source]
    parameters: Any | None = None

    def to_spark_python_task(self, run_context: RunContext) -> SparkPythonTask:
        raise NotImplementedError  # TODO: translate from Java
