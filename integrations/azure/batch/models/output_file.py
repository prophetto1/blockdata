from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\models\OutputFile.java
# WARNING: Unresolved types: azure, batch, com, microsoft, models, protocol

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.azure.batch.models.output_file_destination import OutputFileDestination
from integrations.azure.batch.models.output_file_upload_options import OutputFileUploadOptions
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class OutputFile:
    destination: OutputFileDestination
    upload_options: OutputFileUploadOptions = OutputFileUploadOptions.builder().build()
    file_pattern: Property[str] | None = None

    def to(self, run_context: RunContext) -> com.microsoft.azure.batch.protocol.models.OutputFile:
        raise NotImplementedError  # TODO: translate from Java
