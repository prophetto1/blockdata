from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\models\TaskContainerSettings.java
# WARNING: Unresolved types: ContainerWorkingDirectory, azure, batch, com, microsoft, models, protocol

from dataclasses import dataclass
from typing import Any

from integrations.azure.batch.models.container_registry import ContainerRegistry
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class TaskContainerSettings:
    image_name: Property[str]
    container_run_options: Property[str] | None = None
    registry: ContainerRegistry | None = None
    working_directory: Property[ContainerWorkingDirectory] | None = None

    def to(self, run_context: RunContext) -> com.microsoft.azure.batch.protocol.models.TaskContainerSettings:
        raise NotImplementedError  # TODO: translate from Java
