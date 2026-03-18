from __future__ import annotations

# Source: E:\KESTRA\script\src\main\java\io\kestra\plugin\scripts\exec\AbstractExecScript.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.plugin.scripts.exec.scripts.runners.commands_wrapper import CommandsWrapper
from engine.plugin.scripts.runner.docker.docker import Docker
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.tasks.output_files_interface import OutputFilesInterface
from engine.core.runners.run_context import RunContext
from engine.plugin.scripts.exec.scripts.models.runner_type import RunnerType
from engine.core.models.tasks.runners.target_os import TargetOS
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class AbstractExecScript(ABC, Task):
    task_runner: TaskRunner[Any]
    interpreter: Property[list[str]]
    fail_fast: Property[bool]
    target_os: Property[TargetOS]
    runner: RunnerType | None = None
    before_commands: Property[list[str]] | None = None
    env: Property[dict[str, str]] | None = None
    warning_on_std_err: Property[bool] | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[str]] | None = None
    output_directory: Property[bool] | None = None
    docker: DockerOptions | None = None

    @abstractmethod
    def get_container_image(self) -> Property[str]:
        ...

    def inject_defaults(self, run_context: RunContext, original: DockerOptions | None = None) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def commands(self, run_context: RunContext) -> CommandsWrapper:
        raise NotImplementedError  # TODO: translate from Java

    def get_before_commands_with_options(self, run_context: RunContext) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def may_add_exit_on_error_commands(self, commands: list[str], run_context: RunContext) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_exit_on_error_commands(self, run_context: RunContext) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
