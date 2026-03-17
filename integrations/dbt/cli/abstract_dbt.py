from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from pathlib import Path

from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.tasks.output_files_interface import OutputFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.runner_type import RunnerType
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class AbstractDbt(Task, RunnableTask, NamespaceFilesInterface, InputFilesInterface, OutputFilesInterface):
    d_e_f_a_u_l_t__i_m_a_g_e: str | None = None
    fail_fast: Property[bool] | None = None
    warn_error: Property[bool] | None = None
    debug: Property[bool] | None = None
    project_dir: Property[str] | None = None
    dbt_path: Property[str] | None = None
    profiles: Property[str] | None = None
    task_runner: TaskRunner[Any] | None = None
    container_image: Property[str] | None = None
    runner: Property[RunnerType] | None = None
    docker: Property[DockerOptions] | None = None
    docker_options: Property[DockerOptions] | None = None
    env: Property[dict[String, String]] | None = None
    parse_run_results: Property[bool] | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[String]] | None = None

    def dbt_commands(self, run_context: RunContext) -> java:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def create_dbt_command(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def parse_results(self, run_context: RunContext, working_directory: Path, script_output: ScriptOutput) -> None:
        raise NotImplementedError  # TODO: translate from Java
