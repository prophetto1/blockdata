from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\targets\MeltanoSnowflake.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.singer.targets.abstract_python_target import AbstractPythonTarget
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class MeltanoSnowflake(AbstractPythonTarget):
    """Load data into a Snowflake database with a Singer target."""
    account: str
    database: str
    username: str
    warehouse: str
    schema: str
    add_record_metadata: Property[bool] = Property.ofValue(true)
    password: Property[str] | None = None
    role: Property[str] | None = None
    default_target_schema: Property[str] | None = None
    flattening_enabled: Property[bool] | None = None
    flattening_max_depth: Property[int] | None = None

    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
