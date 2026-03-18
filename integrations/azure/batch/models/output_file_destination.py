from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\models\OutputFileDestination.java
# WARNING: Unresolved types: azure, batch, com, microsoft, models, protocol

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.azure.batch.models.output_file_blob_container_destination import OutputFileBlobContainerDestination
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class OutputFileDestination:
    container: OutputFileBlobContainerDestination

    def to(self, run_context: RunContext) -> com.microsoft.azure.batch.protocol.models.OutputFileDestination:
        raise NotImplementedError  # TODO: translate from Java
