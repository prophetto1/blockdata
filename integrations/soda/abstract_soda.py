from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-soda\src\main\java\io\kestra\plugin\soda\AbstractSoda.java
# WARNING: Unresolved types: Exception, IOException, ObjectMapper

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from engine.plugin.scripts.exec.scripts.runners.commands_wrapper import CommandsWrapper
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.plugin.scripts.exec.scripts.models.runner_type import RunnerType
from integrations.azure.batch.models.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class AbstractSoda(ABC, Task):
    configuration: Property[dict[str, Any]]
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "sodadata/soda-core"
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofYaml()
    task_runner: TaskRunner[Any] = Docker.instance()
    container_image: Property[str] = Property.ofValue(DEFAULT_IMAGE)
    runner: Property[RunnerType] | None = None
    docker: DockerOptions | None = None
    docker_options: DockerOptions | None = None
    input_files: Any | None = None
    requirements: Property[list[str]] | None = None
    env: Property[dict[str, str]] | None = None

    def final_input_files(self, run_context: RunContext, working_directory: Path) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def start(self, run_context: RunContext) -> CommandsWrapper:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def virtual_env_command(self, run_context: RunContext, working_directory: Path, requirements: list[str]) -> str:
        raise NotImplementedError  # TODO: translate from Java
