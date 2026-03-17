from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\vertexai\models\DiscSpec.java
# WARNING: Unresolved types: DiskSpec, aiplatform, cloud, com, google, v1

from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class DiscSpec:
    boot_disk_type: Property[DiskType] = Property.ofValue(DiskType.PD_SSD)
    boot_disk_size_gb: Property[int] = Property.ofValue(100)

    def to(self, run_context: RunContext) -> com.google.cloud.aiplatform.v1.DiskSpec:
        raise NotImplementedError  # TODO: translate from Java

    class DiskType(str, Enum):
        PD_SSD = "PD_SSD"
        PD_STANDARD = "PD_STANDARD"
