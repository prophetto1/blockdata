from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\models\OutputFileUploadOptions.java
# WARNING: Unresolved types: OutputFileUploadCondition, azure, batch, com, microsoft, models, protocol

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class OutputFileUploadOptions:
    upload_condition: Property[OutputFileUploadCondition] = Property.ofValue(OutputFileUploadCondition.TASK_COMPLETION)

    def to(self, run_context: RunContext) -> com.microsoft.azure.batch.protocol.models.OutputFileUploadOptions:
        raise NotImplementedError  # TODO: translate from Java
