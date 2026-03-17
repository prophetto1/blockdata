from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SparkPythonTaskSetting:
    python_file: Property[str]
    parameters: Any | None = None
    spark_python_task_source: Property[Source]

    def to_spark_python_task(self, run_context: RunContext) -> SparkPythonTask:
        raise NotImplementedError  # TODO: translate from Java
