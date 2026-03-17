from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.tasks.output_files_interface import OutputFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class DatabricksSQLCLI(Task, RunnableTask, NamespaceFilesInterface, InputFilesInterface, OutputFilesInterface):
    """Execute SQL via Databricks SQL CLI"""
    d_e_f_a_u_l_t__i_m_a_g_e: str | None = None
    host: Property[str]
    token: Property[str]
    http_path: Property[str]
    commands: Property[list[String]]
    options: Property[dict[String, String]] | None = None
    task_runner: TaskRunner[Any] | None = None
    container_image: Property[str] | None = None
    docker: DockerOptions | None = None
    input_files: Any | None = None
    output_files: Property[list[String]] | None = None

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def get_databricks_command(self, run_context: RunContext) -> list[String]:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def get_input_files(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_namespace_files(self) -> NamespaceFiles:
        raise NotImplementedError  # TODO: translate from Java
