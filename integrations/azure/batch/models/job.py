from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\models\Job.java
# WARNING: Unresolved types: JobAddParameter, PoolInformation

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Job:
    id: str
    display_name: str | None = None
    priority: Property[int] | None = None
    max_parallel_tasks: Property[int] | None = None
    labels: Property[dict[str, str]] | None = None

    def to(self, run_context: RunContext, pool_information: PoolInformation) -> JobAddParameter:
        raise NotImplementedError  # TODO: translate from Java
