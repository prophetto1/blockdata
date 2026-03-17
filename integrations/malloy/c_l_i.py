from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-malloy\src\main\java\io\kestra\plugin\malloy\CLI.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.plugin.scripts.exec.abstract_exec_script import AbstractExecScript
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class CLI(AbstractExecScript):
    """Run Malloy CLI commands"""
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "ghcr.io/kestra-io/malloy"
    task_runner: TaskRunner[Any] = Docker.instance()
    container_image: Property[str] = Property.ofValue(DEFAULT_IMAGE)
    commands: Property[list[str]] | None = None

    def inject_defaults(self, run_context: RunContext, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java
