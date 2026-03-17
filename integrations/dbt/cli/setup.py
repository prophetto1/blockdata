from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from engine.plugin.scripts.exec.abstract_exec_script import AbstractExecScript
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class Setup(AbstractExecScript, RunnableTask):
    """Setup dbt in a Python virtualenv (Deprecated)."""
    m_a_p_p_e_r: ObjectMapper | None = None
    d_e_f_a_u_l_t__i_m_a_g_e: str | None = None
    profiles: Property[Any]
    python_path: str = DEFAULT_IMAGE
    requirements: Property[list[String]]
    exit_on_failed: Property[bool]
    input_files: Property[Any] | None = None
    task_runner: TaskRunner[Any] | None = None
    container_image: Property[str] | None = None
    docker_options: Property[DockerOptions] | None = None

    def inject_defaults(self, run_context: RunContext, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def virtual_env_command(self, run_context: RunContext, working_directory: Path, requirements: list[String]) -> list[String]:
        raise NotImplementedError  # TODO: translate from Java

    def profiles_content(self, run_context: RunContext, profiles: Any) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def final_input_files(self, run_context: RunContext) -> dict[String, String]:
        raise NotImplementedError  # TODO: translate from Java
