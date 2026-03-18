from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\vertexai\models\MachineSpec.java
# WARNING: Unresolved types: AcceleratorType, aiplatform, cloud, com, google, v1

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class MachineSpec:
    machine_type: Property[str]
    accelerator_count: Property[int] | None = None
    accelerator_type: Property[com.google.cloud.aiplatform.v1.AcceleratorType] | None = None

    def to(self, run_context: RunContext) -> com.google.cloud.aiplatform.v1.MachineSpec:
        raise NotImplementedError  # TODO: translate from Java
