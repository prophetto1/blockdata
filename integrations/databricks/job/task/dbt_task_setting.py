from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\job\task\DbtTaskSetting.java
# WARNING: Unresolved types: DbtTask

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class DbtTaskSetting:
    catalog: Property[str] | None = None
    schema: Property[str] | None = None
    warehouse_id: Property[str] | None = None
    commands: Property[list[str]] | None = None

    def to_dbt_task(self, run_context: RunContext) -> DbtTask:
        raise NotImplementedError  # TODO: translate from Java
