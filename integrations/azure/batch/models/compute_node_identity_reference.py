from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\models\ComputeNodeIdentityReference.java
# WARNING: Unresolved types: azure, batch, com, microsoft, models, protocol

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class ComputeNodeIdentityReference:
    resource_id: Property[str] | None = None

    def to(self, run_context: RunContext) -> com.microsoft.azure.batch.protocol.models.ComputeNodeIdentityReference:
        raise NotImplementedError  # TODO: translate from Java
