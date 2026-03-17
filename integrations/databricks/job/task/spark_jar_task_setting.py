from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\job\task\SparkJarTaskSetting.java
# WARNING: Unresolved types: SparkJarTask

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SparkJarTaskSetting:
    jar_uri: Property[str] | None = None
    main_class_name: Property[str] | None = None
    parameters: Any | None = None

    def to_spark_jar_task(self, run_context: RunContext) -> SparkJarTask:
        raise NotImplementedError  # TODO: translate from Java
