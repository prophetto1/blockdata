from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\models\Task.java
# WARNING: Unresolved types: TaskAddParameter

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.azure.batch.models.output_file import OutputFile
from engine.core.models.property.property import Property
from integrations.azure.batch.models.resource_file import ResourceFile
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task_constraints import TaskConstraints
from integrations.azure.batch.models.task_container_settings import TaskContainerSettings


@dataclass(slots=True, kw_only=True)
class Task:
    id: str
    commands: Property[list[str]]
    interpreter: Property[str] = Property.ofValue("/bin/sh")
    interpreter_args: list[str] = {"-c"}
    display_name: str | None = None
    container_settings: TaskContainerSettings | None = None
    output_files: Property[list[str]] | None = None
    output_dirs: Property[list[str]] | None = None
    resource_files: list[ResourceFile] | None = None
    upload_files: list[OutputFile] | None = None
    environments: Property[dict[str, str]] | None = None
    constraints: TaskConstraints | None = None
    required_slots: Property[int] | None = None

    def to(self, run_context: RunContext) -> TaskAddParameter:
        raise NotImplementedError  # TODO: translate from Java

    def command_line(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
