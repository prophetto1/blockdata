from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from engine.plugin.scripts.exec.scripts.runners.commands_wrapper import CommandsWrapper
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.plugin.scripts.exec.scripts.models.runner_type import RunnerType
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class AbstractSoda(Task):
    d_e_f_a_u_l_t__i_m_a_g_e: str | None = None
    m_a_p_p_e_r: ObjectMapper | None = None
    runner: Property[RunnerType] | None = None
    docker: DockerOptions | None = None
    task_runner: TaskRunner[Any] | None = None
    container_image: Property[str] | None = None
    docker_options: DockerOptions | None = None
    input_files: Any | None = None
    requirements: Property[list[String]] | None = None
    env: Property[dict[String, String]] | None = None
    configuration: Property[dict[String, Object]]

    def final_input_files(self, run_context: RunContext, working_directory: Path) -> dict[String, String]:
        raise NotImplementedError  # TODO: translate from Java

    def start(self, run_context: RunContext) -> CommandsWrapper:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def virtual_env_command(self, run_context: RunContext, working_directory: Path, requirements: list[String]) -> str:
        raise NotImplementedError  # TODO: translate from Java
