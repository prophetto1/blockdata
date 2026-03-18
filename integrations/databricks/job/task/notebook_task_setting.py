from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\job\task\NotebookTaskSetting.java
# WARNING: Unresolved types: NotebookTask, Source

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class NotebookTaskSetting:
    notebook_path: Property[str] | None = None
    source: Property[Source] | None = None
    base_parameters: Any | None = None

    def to_notebook_task(self, run_context: RunContext) -> NotebookTask:
        raise NotImplementedError  # TODO: translate from Java
