from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.plugin.scripts.exec.abstract_exec_script import AbstractExecScript
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class Diff(AbstractExecScript, RunnableTask):
    """Compare databases with Liquibase diff"""
    d_e_f_a_u_l_t__i_m_a_g_e: str | None = None
    container_image: Property[str] | None = None
    url: Property[str]
    username: Property[str] | None = None
    password: Property[str] | None = None
    reference_url: Property[str]
    reference_username: Property[str] | None = None
    reference_password: Property[str] | None = None
    changelog_file: Property[str] | None = None
    commands: Property[list[String]] | None = None
    task_runner: TaskRunner[Any] | None = None

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, run_context: RunContext, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java
