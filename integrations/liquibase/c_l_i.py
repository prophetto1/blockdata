from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.plugin.scripts.exec.abstract_exec_script import AbstractExecScript
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.tasks.output_files_interface import OutputFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class CLI(AbstractExecScript, RunnableTask, NamespaceFilesInterface, InputFilesInterface, OutputFilesInterface):
    """Execute custom Liquibase CLI commands"""
    d_e_f_a_u_l_t__i_m_a_g_e: str | None = None
    commands: Property[list[String]]
    task_runner: TaskRunner[Any] | None = None
    container_image: Property[str] | None = None

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, run_context: RunContext, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java
