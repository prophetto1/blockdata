from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\vertexai\models\Scheduling.java
# WARNING: Unresolved types: aiplatform, cloud, com, google, v1

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Scheduling:
    time_out: Property[timedelta]
    restart_job_on_worker_restart: Property[bool]

    def to(self, run_context: RunContext) -> com.google.cloud.aiplatform.v1.Scheduling:
        raise NotImplementedError  # TODO: translate from Java
