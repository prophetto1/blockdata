from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\job\task\SqlTaskSetting.java
# WARNING: Unresolved types: SqlTask

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SqlTaskSetting:
    warehouse_id: Property[str] | None = None
    query_id: Property[str] | None = None
    parameters: Any | None = None

    def to_sql_task(self, run_context: RunContext) -> SqlTask:
        raise NotImplementedError  # TODO: translate from Java
