from __future__ import annotations

# Source: E:\KESTRA\script\src\main\java\io\kestra\plugin\scripts\exec\scripts\runners\CommandsWrapper.java
# WARNING: Unresolved types: Exception, IOException, T, core, io, kestra, models, runners, tasks

from dataclasses import dataclass
from pathlib import Path
from datetime import timedelta
from typing import Any

from engine.core.models.tasks.runners.abstract_log_consumer import AbstractLogConsumer
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.plugin.scripts.exec.scripts.models.runner_type import RunnerType
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.tasks.runners.target_o_s import TargetOS
from engine.core.models.tasks.runners.task_commands import TaskCommands
from engine.core.models.tasks.runners.task_runner import TaskRunner
from engine.core.models.tasks.runners.task_runner_detail_result import TaskRunnerDetailResult


@dataclass(slots=True, kw_only=True)
class CommandsWrapper:
    run_context: RunContext | None = None
    working_directory: Path | None = None
    output_directory: Path | None = None
    additional_vars: dict[str, Any] | None = None
    interpreter: Property[list[str]] | None = None
    before_commands: Property[list[str]] | None = None
    commands: Property[list[str]] | None = None
    before_commands_with_options: bool | None = None
    fail_fast: bool | None = None
    env: dict[str, str] | None = None
    log_consumer: io.kestra.core.models.tasks.runners.AbstractLogConsumer | None = None
    runner_type: RunnerType | None = None
    container_image: str | None = None
    task_runner: TaskRunner[Any] | None = None
    docker_options: DockerOptions | None = None
    warning_on_std_err: bool | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: list[str] | None = None
    enable_output_directory: bool | None = None
    timeout: timedelta | None = None
    target_o_s: TargetOS | None = None

    def with_env(self, envs: dict[str, str]) -> CommandsWrapper:
        raise NotImplementedError  # TODO: translate from Java

    def add_additional_vars(self, additional_vars: dict[str, Any]) -> CommandsWrapper:
        raise NotImplementedError  # TODO: translate from Java

    def add_env(self, envs: dict[str, str]) -> CommandsWrapper:
        raise NotImplementedError  # TODO: translate from Java

    def run(self) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def get_output_files(self, task_runner_run_context: RunContext) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_task_runner(self) -> TaskRunner[T]:
        raise NotImplementedError  # TODO: translate from Java

    def get_enable_output_directory(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_output_directory(self) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, run_context: RunContext, command: str, internal_storage_local_files: list[str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, run_context: RunContext, command: Property[str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render_commands(self, run_context: RunContext, commands: Property[list[str]]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_before_commands_with_options(self, before_commands: list[str]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_exit_on_error_commands(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java
